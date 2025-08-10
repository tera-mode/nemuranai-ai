import sharp from 'sharp';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { ProcessedStep } from './template-engine';
import { saveGeneratedImageToStorage } from './image-generation';

export interface ToolResult {
  success: boolean;
  outputs?: string[];
  error?: string;
  durationMs: number;
  cost?: number;
}

export class PromptBuilder {
  static async build(params: { system: string; inject: string[] }): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const prompt = [params.system, ...params.inject].filter(Boolean).join('; ');
      
      return {
        success: true,
        outputs: [prompt],
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime
      };
    }
  }
}

export class StabilityAdapter {
  static async generate(params: {
    prompt: string;
    aspect_ratio: string;
    output: string;
    negative?: string;
    seed?: number;
    useCase?: string;
    userId?: string;
  }): Promise<ToolResult> {
    const startTime = Date.now();
    
    // デバッグ用: 最終的な画像生成パラメータをコンソールに出力
    console.log('🎨 === STABILITY API REQUEST DEBUG ===');
    console.log('📝 Final Prompt:', params.prompt);
    console.log('📐 Aspect Ratio:', params.aspect_ratio);
    console.log('📁 Output File:', params.output);
    console.log('❌ Negative Prompt:', params.negative || 'none');
    console.log('🎲 Seed:', params.seed || 'random');
    console.log('🏷️ Use Case:', params.useCase || 'general');
    console.log('⏰ Request Time:', new Date().toISOString());
    console.log('🎨 =====================================');
    
    try {
      const formData = new FormData();
      formData.append('prompt', params.prompt);
      formData.append('aspect_ratio', params.aspect_ratio);
      formData.append('output_format', 'png');
      
      if (params.negative) {
        formData.append('negative_prompt', params.negative);
      }
      
      if (params.seed) {
        formData.append('seed', params.seed.toString());
      }

      // Use cheaper model for logos in development, Ultra for hero backgrounds
      const isDev = process.env.NODE_ENV === 'development';
      const isLogo = params.useCase === 'logo';
      
      let endpoint = 'https://api.stability.ai/v2beta/stable-image/generate/ultra';
      let cost = 0.04;
      
      if (isDev && isLogo) {
        endpoint = 'https://api.stability.ai/v2beta/stable-image/generate/core';
        cost = 0.02;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
          'Accept': 'image/*',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Stability API error: ${response.status} - ${errorText}`);
        throw new Error(`Stability API error: ${response.status} - ${errorText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Firebase Storageに保存するか、ローカル一時ファイルに保存するかを選択
      if (params.userId) {
        console.log('💾 Saving design image to Firebase Storage...');
        const firebaseUrl = await saveGeneratedImageToStorage(
          imageBuffer,
          params.userId
        );
        console.log('✅ Design image saved to Firebase:', firebaseUrl);
        
        return {
          success: true,
          outputs: [firebaseUrl],
          durationMs: Date.now() - startTime,
          cost: cost
        };
      } else {
        // フォールバック：ローカル一時保存（開発・テスト用）
        const outputDir = path.join(process.cwd(), 'temp');
        await mkdir(outputDir, { recursive: true });
        
        const outputPath = path.join(outputDir, params.output);
        await writeFile(outputPath, imageBuffer);

        return {
          success: true,
          outputs: [outputPath],
          durationMs: Date.now() - startTime,
          cost: cost
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image generation failed',
        durationMs: Date.now() - startTime
      };
    }
  }
}

export class CanvasComposer {
  static async compose(params: {
    text: string;
    font: string;
    size: number;
    background?: string;
    color?: string;
    width?: number;
    height?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll create a simple text overlay using Sharp
      // In production, you might want to use a different text rendering approach
      const width = params.width || 800;
      const height = params.height || 400;
      
      const outputDir = path.join(process.cwd(), 'temp');
      await mkdir(outputDir, { recursive: true });
      
      // Create a simple colored background if background is specified
      let backgroundBuffer: Buffer;
      if (params.background?.startsWith('#')) {
        // Create a solid color background
        const { data } = await sharp({
          create: {
            width,
            height,
            channels: 4,
            background: params.background
          }
        }).png().toBuffer({ resolveWithObject: true });
        backgroundBuffer = data;
      } else if (params.background) {
        // Load background image
        backgroundBuffer = await sharp(params.background)
          .resize(width, height)
          .png()
          .toBuffer();
      } else {
        // Default white background
        const { data } = await sharp({
          create: {
            width,
            height,
            channels: 4,
            background: '#ffffff'
          }
        }).png().toBuffer({ resolveWithObject: true });
        backgroundBuffer = data;
      }

      // Calculate text position and size based on layout
      const textColor = params.color || '#000000';
      const fontSize = Math.min(params.size, width / 8); // Adaptive font size
      const textX = width * 0.75; // Position text on right side
      const textY = height * 0.5; // Center vertically
      
      // For text overlay with proper positioning
      const textSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text x="${textX}" y="${textY}" 
                font-family="${params.font || 'Arial, sans-serif'}" 
                font-size="${fontSize}px" 
                font-weight="bold"
                fill="${textColor}" 
                text-anchor="middle" 
                dominant-baseline="central">
            ${params.text}
          </text>
        </svg>
      `;

      const outputPath = path.join(outputDir, 'composed.png');
      await sharp(backgroundBuffer)
        .composite([{
          input: Buffer.from(textSvg),
          top: 0,
          left: 0
        }])
        .png()
        .toFile(outputPath);

      return {
        success: true,
        outputs: [outputPath],
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Canvas composition failed',
        durationMs: Date.now() - startTime
      };
    }
  }
}

export class SharpProcessor {
  static async process(params: {
    input: string;
    formats: string[];
    maxKB?: number;
    variants?: string[];
    width?: number;
    height?: number;
  }): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const outputs: string[] = [];
      const outputDir = path.join(process.cwd(), 'temp');
      await mkdir(outputDir, { recursive: true });

      for (const format of params.formats) {
        let pipeline = sharp(params.input);
        
        // Resize if specified
        if (params.width || params.height) {
          pipeline = pipeline.resize(params.width, params.height, {
            fit: 'cover',
            position: 'center'
          });
        }

        // Apply variants
        if (params.variants?.includes('palette_shift')) {
          pipeline = pipeline.modulate({
            hue: Math.round(15 + Math.random() * 30) // Slight hue shift, rounded to integer
          });
        }

        // Format specific processing
        let outputPath: string;
        switch (format) {
          case 'png':
            outputPath = path.join(outputDir, `processed.png`);
            await pipeline.png({ quality: 90 }).toFile(outputPath);
            break;
          case 'webp':
            outputPath = path.join(outputDir, `processed.webp`);
            let quality = 95; // Higher quality for better results
            
            // Optimize for size if maxKB specified
            if (params.maxKB) {
              let attempt = 0;
              let currentSize = Infinity;
              
              while (currentSize > params.maxKB * 1024 && quality > 60 && attempt < 5) {
                const buffer = await pipeline.webp({ quality }).toBuffer();
                currentSize = buffer.length;
                
                if (currentSize <= params.maxKB * 1024) {
                  await writeFile(outputPath, buffer);
                  break;
                }
                
                quality -= 10; // Smaller quality steps
                attempt++;
              }
            } else {
              await pipeline.webp({ quality }).toFile(outputPath);
            }
            break;
          case 'jpg':
          case 'jpeg':
            outputPath = path.join(outputDir, `processed.jpg`);
            await pipeline.jpeg({ quality: 85 }).toFile(outputPath);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }
        
        outputs.push(outputPath);
      }

      return {
        success: true,
        outputs,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image processing failed',
        durationMs: Date.now() - startTime
      };
    }
  }
}

export class ToolExecutor {
  static async execute(step: ProcessedStep, context: { prompt?: string; lastOutputs?: string[]; useCase?: string; userId?: string }): Promise<ToolResult> {
    const [category, action] = step.tool.split('.');
    
    switch (category) {
      case 'prompt':
        if (action === 'build') {
          return PromptBuilder.build(step.with as any);
        }
        break;
        
      case 'stability':
        if (action === 'generate') {
          const prompt = context.prompt || step.with.prompt || '';
          return StabilityAdapter.generate({ 
            ...step.with, 
            prompt, 
            useCase: context.useCase,
            userId: context.userId 
          } as any);
        }
        break;
        
      case 'compose':
        if (action === 'canvas') {
          const background = context.lastOutputs?.[0];
          return CanvasComposer.compose({ ...step.with, background } as any);
        }
        break;
        
      case 'post':
        if (action === 'sharp') {
          const input = context.lastOutputs?.[0];
          if (!input) {
            throw new Error('No input file for Sharp processing');
          }
          return SharpProcessor.process({ ...step.with, input } as any);
        }
        break;
        
      default:
        return {
          success: false,
          error: `Unknown tool: ${step.tool}`,
          durationMs: 0
        };
    }
    
    return {
      success: false,
      error: `Tool not implemented: ${step.tool}`,
      durationMs: 0
    };
  }
}