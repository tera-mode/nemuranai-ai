// 統一コンテンツ処理パイプライン
// 今日の問題を防ぐための中央集権的データ処理

import Anthropic from '@anthropic-ai/sdk';

interface ProcessingConfig {
  FORCE_AI_PROCESSING: boolean;
  DEBUG_LOGGING: boolean;
  FALLBACK_ENABLED: boolean;
  MAX_CONTENT_LENGTH: number;
}

const DEFAULT_CONFIG: ProcessingConfig = {
  FORCE_AI_PROCESSING: true,   // すべてAI処理を強制
  DEBUG_LOGGING: true,         // 詳細ログ出力
  FALLBACK_ENABLED: true,      // フォールバック有効
  MAX_CONTENT_LENGTH: 4000     // コンテンツ最大長
};

export interface ProcessedContent {
  content: string;
  type: 'markdown' | 'text' | 'error';
  source: 'ai_organized' | 'fallback' | 'direct';
  metadata: {
    originalType: string;
    processingTime: number;
    warnings: string[];
  };
}

/**
 * 統一コンテンツ処理クラス
 * すべてのレポート/コンテンツをここで処理することで一貫性を保証
 */
export class UnifiedContentProcessor {
  private anthropic: Anthropic;
  private config: ProcessingConfig;

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * メインエントリーポイント - すべてのコンテンツはここを通る
   */
  async processContent(input: any, context?: string): Promise<ProcessedContent> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // 入力データの分析とログ出力
      const inputAnalysis = this.analyzeInput(input);
      if (this.config.DEBUG_LOGGING) {
        console.log('🔍 Content processing started:', inputAnalysis);
      }

      // 条件分岐を排除 - すべてAI処理を通す
      if (this.config.FORCE_AI_PROCESSING) {
        const aiResult = await this.processWithAI(input, context);
        
        return {
          content: aiResult,
          type: 'markdown',
          source: 'ai_organized',
          metadata: {
            originalType: inputAnalysis.type,
            processingTime: Date.now() - startTime,
            warnings
          }
        };
      }

      // フォールバック処理（AI処理が無効の場合のみ）
      if (this.config.FALLBACK_ENABLED) {
        warnings.push('AI processing disabled, using fallback');
        const fallbackResult = this.processFallback(input);
        
        return {
          content: fallbackResult,
          type: 'markdown',
          source: 'fallback',
          metadata: {
            originalType: inputAnalysis.type,
            processingTime: Date.now() - startTime,
            warnings
          }
        };
      }

      throw new Error('No processing method available');

    } catch (error) {
      console.error('❌ Content processing failed:', error);
      
      return {
        content: this.generateErrorContent(input, error),
        type: 'error',
        source: 'fallback',
        metadata: {
          originalType: typeof input,
          processingTime: Date.now() - startTime,
          warnings: [...warnings, error instanceof Error ? error.message : 'Unknown error']
        }
      };
    }
  }

  /**
   * 入力データ分析
   */
  private analyzeInput(input: any): { type: string; size: number; hasReportMd: boolean; hasFindings: boolean } {
    return {
      type: typeof input,
      size: JSON.stringify(input).length,
      hasReportMd: !!(input?.report_md),
      hasFindings: !!(input?.findings),
    };
  }

  /**
   * AI処理 - 2部構成フォーマットで統一
   */
  private async processWithAI(input: any, context?: string): Promise<string> {
    // コンテンツの準備
    let inputContent = '';
    
    if (typeof input === 'string') {
      inputContent = input;
    } else if (input?.report_md) {
      inputContent = this.unescapeJsonString(input.report_md);
    } else if (input?.findings) {
      inputContent = this.formatFindingsAsText(input.findings);
    } else {
      inputContent = JSON.stringify(input, null, 2);
    }

    // 長すぎる場合は切り詰め
    if (inputContent.length > this.config.MAX_CONTENT_LENGTH) {
      inputContent = inputContent.substring(0, this.config.MAX_CONTENT_LENGTH) + '\n\n...[内容が長いため省略]';
    }

    const prompt = this.buildAIPrompt(inputContent, context);
    
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0];
    if (responseText?.type === 'text') {
      // 2部構成から第1部（Markdown）のみを抽出
      const parts = responseText.text.split('---');
      if (parts.length >= 2) {
        return parts[0].trim();
      }
      return responseText.text;
    }

    throw new Error('AI processing failed - no valid response');
  }

  /**
   * 統一AIプロンプト
   */
  private buildAIPrompt(content: string, context?: string): string {
    return `あなたはレポート生成AIです。以後、**出力は2部構成**にしてください。

**第1部：ユーザー向け（Markdown）**

* ここは**コードブロックで囲まない**。引用符も付けない。
* 普通のMarkdownとして**そのまま表示**できること。
* 見出し、箇条書き、表などの装飾を使用可。
* 技術的な詳細は省略し、ビジネス価値のある情報に焦点を当てる
* 重要なポイントは太字で強調する
* 日本語として自然な文章にする

**区切り**

* 1行だけ \`---\` を出力する。

**第2部：機械可読（JSON）**

* ここは **\`\`\`json** フェンスで囲む。
* 第1部と**同じ内容**を表現する。Markdown文字列を入れない。
* 数値は数値型で、改行は入れない。

**禁止事項**

* Markdown部をコードブロックやJSON文字列で包むこと
* \`\\n\` で改行をエスケープすること
* 2部を逆順に出すこと

${context ? `**追加コンテキスト**: ${context}\n\n` : ''}**処理対象データ**：
${content}

上記のデータを、読みやすいビジネスレポートとして2部構成で整理してください。`;
  }

  /**
   * フォールバック処理
   */
  private processFallback(input: any): string {
    if (typeof input === 'string') {
      return this.createMarkdownReport('データ', input);
    }
    
    if (input?.findings) {
      return this.createMarkdownReport('調査結果', this.formatFindingsAsText(input.findings));
    }
    
    if (input?.report_md) {
      return this.unescapeJsonString(input.report_md);
    }
    
    return this.createMarkdownReport('処理結果', JSON.stringify(input, null, 2));
  }

  /**
   * エラー時のコンテンツ生成
   */
  private generateErrorContent(input: any, error: any): string {
    return this.createMarkdownReport(
      'エラー報告',
      `処理中にエラーが発生しました。\n\nエラー詳細: ${error instanceof Error ? error.message : 'Unknown error'}\n\n元データの形式: ${typeof input}`
    );
  }

  /**
   * 標準的なMarkdownレポート作成
   */
  private createMarkdownReport(title: string, content: string): string {
    return `# ${title}レポート

*生成日時: ${new Date().toLocaleDateString('ja-JP')}*

## 概要

以下に処理結果をまとめています。

## 詳細

${content.length > 2000 ? content.substring(0, 2000) + '\n\n...[内容が長いため省略]' : content}

---

*このレポートは統一コンテンツ処理システムにより自動生成されました。*`;
  }

  /**
   * findings データのテキスト変換
   */
  private formatFindingsAsText(findings: any[]): string {
    return findings.map((finding, index) => {
      let text = `${index + 1}. ${finding.claim}\n`;
      if (finding.support && finding.support[0]) {
        text += `   出典: ${finding.support[0].title} (${finding.support[0].url})\n`;
      }
      if (finding.confidence) {
        text += `   信頼度: ${Math.round(finding.confidence * 100)}%\n`;
      }
      return text;
    }).join('\n');
  }

  /**
   * JSONエスケープ解除
   */
  private unescapeJsonString(str: string): string {
    try {
      if (str.startsWith('"') && str.endsWith('"')) {
        return JSON.parse(str);
      }
    } catch (error) {
      // JSON.parseが失敗した場合は手動でエスケープを解除
    }

    return str
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }
}

// シングルトンインスタンス
export const contentProcessor = new UnifiedContentProcessor();

// 便利な関数エクスポート  
export async function processAnyContent(input: any, context?: string): Promise<string> {
  const result = await contentProcessor.processContent(input, context);
  return result.content;
}