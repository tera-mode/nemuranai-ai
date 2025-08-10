import { TemplateEngine, TemplateContext } from './template-engine';
import { ToolExecutor, ToolResult } from './design-tools';
import { createRun, updateDesignJobStatus, createArtifact } from './design-actions';
import { Brand, DesignJob, RunStep, JobStatus } from '@/types/design';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFile } from 'fs/promises';
import path from 'path';
import { saveGeneratedImageToStorage } from './image-generation';

export class JobExecutor {
  private templateEngine = new TemplateEngine();

  async executeJob(job: DesignJob, brand: Brand): Promise<void> {
    try {
      console.log(`Starting job execution for ${job.id}, useCase: ${job.useCase}`);
      await updateDesignJobStatus(job.id!, 'running');

      // Load template
      console.log(`Loading template for useCase: ${job.useCase}`);
      const template = await this.templateEngine.loadTemplate(job.useCase);
      console.log(`Template loaded successfully:`, template);
      const context: TemplateContext = { brand, job };

      let currentPrompt = '';
      let lastOutputs: string[] = [];

      // Execute each step
      console.log(`Executing ${template.steps.length} steps...`);
      for (const step of template.steps) {
        console.log(`Processing step: ${step.tool}`);
        const processedStep = this.templateEngine.processStepWithContext(step, context);
        const repeatCount = processedStep.repeat;
        console.log(`Step will repeat ${repeatCount} times`);

        // Execute step (potentially multiple times)
        for (let i = 0; i < repeatCount; i++) {
          const startTime = Date.now();
          console.log(`Executing ${step.tool} (attempt ${i + 1}/${repeatCount})`);
          
          try {
            const result = await ToolExecutor.execute(processedStep, {
              prompt: currentPrompt,
              lastOutputs,
              useCase: job.useCase,
              userId: job.userId // Add userId for Firebase Storage
            });
            console.log(`Step ${step.tool} result:`, result);

            // Log execution
            await createRun({
              jobId: job.id!,
              step: step.tool as RunStep,
              inputHash: this.hashInputs(processedStep.with),
              outputHash: result.outputs ? this.hashOutputs(result.outputs) : undefined,
              durationMs: result.durationMs,
              cost: result.cost,
              status: result.success ? 'ok' : 'error',
              error: result.error
            });

            if (!result.success) {
              throw new Error(`Tool execution failed: ${result.error}`);
            }

            // Update context for next step
            if (step.tool === 'prompt.build' && result.outputs) {
              currentPrompt = result.outputs[0];
            } else if (result.outputs) {
              lastOutputs = result.outputs;
            }

          } catch (error) {
            console.error(`Step execution failed:`, error);
            await updateDesignJobStatus(job.id!, 'failed');
            throw error;
          }
        }
      }

      // Create artifacts from local temp files (no Firebase Storage upload)
      await this.createLocalArtifacts(job.id!, lastOutputs);
      await updateDesignJobStatus(job.id!, 'need_approval');

    } catch (error) {
      console.error('Job execution failed:', error);
      await updateDesignJobStatus(job.id!, 'failed');
      throw error;
    }
  }

  private async createLocalArtifacts(jobId: string, filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        console.log(`Creating artifact record for: ${filePath}`);
        const fileName = path.basename(filePath);
        const fileBuffer = await readFile(filePath);
        console.log(`File read successfully, size: ${fileBuffer.length} bytes`);
        
        // Get image dimensions
        const { width, height, size } = await this.getImageInfo(fileBuffer);

        // Create artifact record pointing to local temp file
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const previewUrl = `/api/temp-image/${tempId}`;
        
        // Save to Firebase Storage instead of temp storage
        console.log('💾 Saving design artifact to Firebase Storage...');
        const firebaseUrl = await saveGeneratedImageToStorage(
          fileBuffer,
          'system', // userId for design system
          jobId     // characterId param used as jobId
        );
        console.log('✅ Design artifact saved to Firebase:', firebaseUrl);
        
        await createArtifact({
          jobId,
          type: 'image',
          storagePath: firebaseUrl, // Firebase Storage URL
          previewUrl: firebaseUrl,
          w: width,
          h: height,
          size: size
        });

        console.log(`Artifact created: ${tempId}`);

      } catch (error) {
        console.error(`Failed to create artifact for ${filePath}:`, error);
        throw error;
      }
    }
  }

  private async getImageInfo(buffer: Buffer): Promise<{ width: number; height: number; size: number }> {
    // Simple implementation - in production you might use a proper image library
    return {
      width: 800, // Default/estimated values
      height: 600,
      size: buffer.length
    };
  }

  private hashInputs(inputs: Record<string, any>): string {
    return Buffer.from(JSON.stringify(inputs)).toString('base64').slice(0, 16);
  }

  private hashOutputs(outputs: string[]): string {
    return Buffer.from(outputs.join('|')).toString('base64').slice(0, 16);
  }
}

export const jobExecutor = new JobExecutor();