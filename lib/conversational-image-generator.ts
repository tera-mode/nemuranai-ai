import { StabilityAdapter } from './design-tools';
import { storeTempImage } from './temp-storage';
import { DesignSession } from './conversational-design';

export class ConversationalImageGenerator {
  static async generateLogoFromRequirements(session: DesignSession): Promise<string> {
    console.log('🚀 Starting generateLogoFromRequirements');
    console.log('📋 Session:', {
      id: session.id,
      userId: session.userId,
      threadId: session.threadId,
      requirements: session.requirements
    });
    
    const req = session.requirements;
    
    // ロゴ生成用プロンプトを構築
    const prompt = await this.buildLogoPrompt(req);
    console.log('🎨 Generated prompt:', prompt);
    
    try {
      console.log('🔮 Calling StabilityAdapter.generate...');
      console.log('⚙️ Generation parameters:', {
        prompt: prompt,
        aspect_ratio: this.mapLayoutToAspectRatio(req.layout),
        output: `logo_${session.id}.png`,
        negative: 'text, letters, words, watermark, signature, ugly, blurry, low quality',
        useCase: 'logo'
      });
      
      // Stability AIで画像生成
      const result = await StabilityAdapter.generate({
        prompt: prompt,
        aspect_ratio: this.mapLayoutToAspectRatio(req.layout),
        output: `logo_${session.id}.png`,
        negative: 'text, letters, words, watermark, signature, ugly, blurry, low quality',
        useCase: 'logo'
      });

      console.log('🎯 StabilityAdapter result:', {
        success: result.success,
        error: result.error,
        outputsLength: result.outputs?.length || 0,
        outputs: result.outputs
      });

      if (!result.success) {
        throw new Error(result.error || 'Image generation failed');
      }

      console.log('📁 Reading generated image file...');
      // 生成された画像をtemp storageに保存
      const imagePath = result.outputs![0];
      console.log('📂 Image path:', imagePath);
      
      const imageBuffer = await import('fs/promises').then(fs => fs.readFile(imagePath));
      console.log('💾 Image buffer size:', imageBuffer.length);
      
      const base64Data = imageBuffer.toString('base64');
      console.log('🔤 Base64 data size:', base64Data.length);
      
      const tempId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated tempId:', tempId);
      
      console.log('💾 Storing temp image...');
      storeTempImage(tempId, base64Data, session.userId, session.threadId);
      
      // セッションに画像を記録
      session.generatedImages.push(tempId);
      session.status = 'reviewing';
      
      console.log('✨ Image generated successfully:', tempId);
      console.log('📝 Updated session status:', session.status);
      console.log('🖼️ Generated images array:', session.generatedImages);
      
      return tempId;
      
    } catch (error) {
      console.error('❌ Image generation failed at step:', error);
      console.error('📚 Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  private static async buildLogoPrompt(requirements: Record<string, any>): Promise<string> {
    const brandName = requirements.brandName || 'Company';
    const industry = await this.translateToEnglish(requirements.industry || '');
    const vibe = requirements.vibe || 'professional';
    const colors = await this.translateToEnglish(requirements.colors || 'blue, white');
    const symbolHint = await this.translateToEnglish(requirements.symbolPreference || '');

    // ベースプロンプト
    let prompt = `Professional logo design for "${brandName}"`;
    
    // 業界情報を追加
    if (industry) {
      const industryKeywords = this.extractIndustryKeywords(industry);
      prompt += `, ${industryKeywords} company`;
    }

    // 印象・スタイルを追加（翻訳済み）
    const translatedVibe = await this.translateToEnglish(vibe);
    if (translatedVibe) {
      prompt += `, ${translatedVibe} style`;
    }

    // カラー情報を追加
    if (colors) {
      const colorKeywords = this.parseColors(colors);
      prompt += `, using ${colorKeywords} colors`;
    }

    // シンボル情報を追加
    if (symbolHint && symbolHint.trim() !== '') {
      if (symbolHint.includes('文字')) {
        prompt += ', stylized typography';
      } else {
        prompt += `, with ${symbolHint}`;
      }
    }

    // 技術的仕様を追加
    prompt += ', vector style, clean design, no text, logomark only, high quality';

    return prompt;
  }

  private static extractIndustryKeywords(industry: string): string {
    const keywords = [];
    
    if (industry.includes('AI') || industry.includes('人工知能')) {
      keywords.push('AI', 'technology');
    }
    if (industry.includes('WEB') || industry.includes('アプリ')) {
      keywords.push('software', 'digital');
    }
    if (industry.includes('ゲーム') || industry.includes('game')) {
      keywords.push('gaming', 'entertainment');
    }
    if (industry.includes('異世界') || industry.includes('ファンタジー')) {
      keywords.push('fantasy', 'creative');
    }
    if (industry.includes('バーチャル') || industry.includes('virtual')) {
      keywords.push('virtual', 'digital');
    }

    return keywords.length > 0 ? keywords.join(', ') : 'tech';
  }

  private static parseColors(colorString: string): string {
    // 日本語色名を英語に変換
    const colorMap: Record<string, string> = {
      'ゴールド': 'gold',
      'ホワイト': 'white', 
      'ネイビー': 'navy blue',
      'ブルー': 'blue',
      'レッド': 'red',
      'グリーン': 'green',
      'ブラック': 'black',
      'グレー': 'gray',
      'シルバー': 'silver',
      'オレンジ': 'orange',
      'パープル': 'purple'
    };

    let result = colorString.toLowerCase();
    
    // 日本語色名を英語に変換
    Object.entries(colorMap).forEach(([jp, en]) => {
      result = result.replace(new RegExp(jp.toLowerCase(), 'g'), en);
    });

    return result;
  }

  private static async translateToEnglish(text: string): Promise<string> {
    if (!text || text.trim() === '') return '';
    
    // 既に英語の場合はそのまま返す（簡易的な判定）
    if (!/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
      return text;
    }
    
    try {
      const claudeApiKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeApiKey) {
        console.warn('⚠️ Claude API key not found, skipping translation');
        return text;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: `Translate the following Japanese text to English for use in an image generation prompt. Keep it concise and descriptive: "${text}"`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.content[0]?.text?.trim() || text;
      
      console.log('🔤 Translation:', { original: text, translated: translatedText });
      return translatedText;
      
    } catch (error) {
      console.error('❌ Translation failed:', error);
      return text; // フォールバック
    }
  }

  private static mapLayoutToAspectRatio(layout: string): string {
    const layoutMap: Record<string, string> = {
      '横長': '16:9',
      'ワイド': '16:9', 
      '正方形': '1:1',
      'スクエア': '1:1',
      '縦長': '9:16',
      'トール': '9:16'
    };

    return layoutMap[layout] || '16:9';
  }
}