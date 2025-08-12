// 統一エラーハンドリングシステム
// 今日発生した問題のような予期しないエラーを防ぐ

interface ErrorContext {
  operation: string;
  input?: any;
  userId?: string;
  threadId?: string;
  timestamp: Date;
}

interface ErrorResult {
  success: false;
  error: string;
  userMessage: string;
  retryable: boolean;
  context: ErrorContext;
}

interface SuccessResult<T> {
  success: true;
  data: T;
  context: ErrorContext;
}

export type SafeResult<T> = ErrorResult | SuccessResult<T>;

/**
 * 安全な実行ラッパー - すべての重要な処理をここで実行する
 */
export class SafeExecutor {
  
  /**
   * 安全な非同期実行
   */
  static async execute<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      userId?: string;
      threadId?: string;
      fallback?: () => Promise<T>;
      maxRetries?: number;
      retryDelays?: number[];
    } = {}
  ): Promise<SafeResult<T>> {
    const context: ErrorContext = {
      operation,
      userId: options.userId,
      threadId: options.threadId,
      timestamp: new Date()
    };

    const maxRetries = options.maxRetries || 3;
    const retryDelays = options.retryDelays || [1000, 2000, 4000]; // 指数バックオフ

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Executing "${operation}" (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const result = await fn();
        
        console.log(`✅ "${operation}" completed successfully`);
        return {
          success: true,
          data: result,
          context
        };

      } catch (error) {
        console.error(`❌ "${operation}" failed (attempt ${attempt + 1}):`, error);
        
        const isLastAttempt = attempt === maxRetries;
        const isRetryableError = this.isRetryableError(error);
        
        if (isLastAttempt || !isRetryableError) {
          // フォールバック処理を試行
          if (options.fallback) {
            try {
              console.log(`🔄 Trying fallback for "${operation}"`);
              const fallbackResult = await options.fallback();
              console.log(`✅ Fallback for "${operation}" succeeded`);
              return {
                success: true,
                data: fallbackResult,
                context
              };
            } catch (fallbackError) {
              console.error(`❌ Fallback for "${operation}" also failed:`, fallbackError);
            }
          }
          
          // 最終的にエラーを返す
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            userMessage: this.generateUserFriendlyMessage(operation, error),
            retryable: isRetryableError,
            context
          };
        }
        
        // リトライ前の待機
        if (attempt < maxRetries) {
          const delay = retryDelays[attempt] || 5000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // このコードには到達しないはず
    return {
      success: false,
      error: 'Unexpected execution flow',
      userMessage: '予期しないエラーが発生しました',
      retryable: false,
      context
    };
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private static isRetryableError(error: any): boolean {
    const retryablePatterns = [
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /rate limit/i,
      /429/,  // Too Many Requests
      /502/,  // Bad Gateway
      /503/,  // Service Unavailable
      /504/,  // Gateway Timeout
    ];

    const errorString = String(error);
    return retryablePatterns.some(pattern => pattern.test(errorString));
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  private static generateUserFriendlyMessage(operation: string, error: any): string {
    const errorString = String(error).toLowerCase();

    if (errorString.includes('timeout')) {
      return `処理がタイムアウトしました。ネットワーク接続を確認して、もう一度お試しください。`;
    }

    if (errorString.includes('rate limit') || errorString.includes('429')) {
      return `API使用上限に達しました。しばらく待ってから再度お試しください。`;
    }

    if (errorString.includes('403') || errorString.includes('unauthorized')) {
      return `アクセス権限に問題があります。設定を確認してください。`;
    }

    if (errorString.includes('404') || errorString.includes('not found')) {
      return `要求された情報が見つかりませんでした。別のキーワードで検索してみてください。`;
    }

    if (errorString.includes('json') || errorString.includes('parse')) {
      return `データの形式に問題がありました。システムが自動修正を試みます。`;
    }

    // デフォルトメッセージ
    return `${operation}中に一時的な問題が発生しました。もう一度お試しください。`;
  }
}

/**
 * よく使う安全な実行パターンの便利関数
 */
export async function safeApiCall<T>(
  apiName: string,
  apiCall: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<SafeResult<T>> {
  return SafeExecutor.execute(`${apiName} API call`, apiCall, {
    fallback,
    maxRetries: 2
  });
}

export async function safeDataProcessing<T>(
  processName: string,
  processor: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<SafeResult<T>> {
  return SafeExecutor.execute(`${processName} processing`, processor, {
    fallback,
    maxRetries: 1 // データ処理は通常リトライしない
  });
}

/**
 * 結果の安全な取り出し
 */
export function extractResult<T>(result: SafeResult<T>): T | null {
  if (result.success) {
    return result.data;
  } else {
    console.error('Operation failed:', result.error);
    return null;
  }
}

/**
 * 結果の安全な取り出し（デフォルト値付き）
 */
export function extractResultWithDefault<T>(result: SafeResult<T>, defaultValue: T): T {
  if (result.success) {
    return result.data;
  } else {
    console.error('Operation failed, using default:', result.error);
    return defaultValue;
  }
}