import { promises as fs } from 'fs';
import path from 'path';
import { DesignTemplate, TemplateStep, Brand, DesignJob } from '@/types/design';

export class TemplateEngine {
  private templates: Map<string, DesignTemplate> = new Map();

  async loadTemplate(useCase: string): Promise<DesignTemplate> {
    if (this.templates.has(useCase)) {
      return this.templates.get(useCase)!;
    }

    try {
      const templatePath = path.join(process.cwd(), 'templates', `${useCase}_hybrid_v1.json`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template: DesignTemplate = JSON.parse(templateContent);
      
      this.templates.set(useCase, template);
      return template;
    } catch (error) {
      console.error(`Failed to load template for ${useCase}:`, error);
      throw new Error(`テンプレート読み込みに失敗: ${useCase}`);
    }
  }

  interpolateValues(template: string, context: TemplateContext): string {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      if (value === undefined) {
        return match;
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        if (key.includes('[') && key.includes(']')) {
          const [prop, indexStr] = key.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          return current[prop]?.[index];
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  processStepWithContext(step: TemplateStep, context: TemplateContext): ProcessedStep {
    const processedWith: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(step.with)) {
      if (typeof value === 'string') {
        let processedValue = this.interpolateValues(value, context);
        
        // Special handling for aspect_ratio based on layout
        if (key === 'aspect_ratio' && processedValue === 'square') {
          processedValue = '1:1';
        } else if (key === 'aspect_ratio' && processedValue === 'wide') {
          processedValue = '16:9';
        } else if (key === 'aspect_ratio' && processedValue === 'tall') {
          processedValue = '9:16';
        }
        
        processedWith[key] = processedValue;
      } else if (Array.isArray(value)) {
        processedWith[key] = value.map(item => 
          typeof item === 'string' ? this.interpolateValues(item, context) : item
        );
      } else {
        processedWith[key] = value;
      }
    }

    return {
      tool: step.tool,
      with: processedWith,
      repeat: step.repeat || 1
    };
  }
}

export interface TemplateContext {
  brand: Brand;
  job: DesignJob;
  artifacts?: Record<string, string>;
}

export interface ProcessedStep {
  tool: string;
  with: Record<string, any>;
  repeat: number;
}