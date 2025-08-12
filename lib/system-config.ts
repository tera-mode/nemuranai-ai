// システム設定管理
// 今後の問題を防ぐための中央集権的設定管理

export interface SystemConfig {
  // コンテンツ処理設定
  content: {
    FORCE_AI_PROCESSING: boolean;
    MAX_CONTENT_LENGTH: number;
    ENABLE_DEBUG_LOGGING: boolean;
    FALLBACK_ENABLED: boolean;
  };
  
  // API設定
  api: {
    GOOGLE_SEARCH_MAX_RESULTS: number;
    GOOGLE_API_RETRY_COUNT: number;
    CLAUDE_API_TIMEOUT_MS: number;
    RATE_LIMIT_DELAY_MS: number;
  };
  
  // ポーリング設定
  polling: {
    INTERVAL_MS: number;
    TIMEOUT_MS: number;
    MAX_ERROR_COUNT: number;
    STATE_DETECTION_PATTERNS: string[];
  };
  
  // エラーハンドリング設定
  errorHandling: {
    MAX_RETRIES: number;
    RETRY_DELAYS_MS: number[];
    ENABLE_FALLBACK: boolean;
    LOG_ERRORS: boolean;
  };
  
  // 開発設定
  development: {
    ENABLE_COMPREHENSIVE_LOGGING: boolean;
    MOCK_EXTERNAL_APIS: boolean;
    BYPASS_RATE_LIMITS: boolean;
  };
}

// 本番環境用の安全な設定
const PRODUCTION_CONFIG: SystemConfig = {
  content: {
    FORCE_AI_PROCESSING: true,      // すべてAI処理を強制（今日の問題を防ぐため）
    MAX_CONTENT_LENGTH: 4000,       // コンテンツサイズ制限
    ENABLE_DEBUG_LOGGING: false,    // 本番ではログを抑制
    FALLBACK_ENABLED: true,         // フォールバック常に有効
  },
  
  api: {
    GOOGLE_SEARCH_MAX_RESULTS: 3,   // API上限対策
    GOOGLE_API_RETRY_COUNT: 2,      // リトライ回数を制限
    CLAUDE_API_TIMEOUT_MS: 30000,   // 30秒タイムアウト
    RATE_LIMIT_DELAY_MS: 1000,      // レート制限対策
  },
  
  polling: {
    INTERVAL_MS: 3000,              // 3秒間隔
    TIMEOUT_MS: 120000,             // 2分でタイムアウト
    MAX_ERROR_COUNT: 3,             // 3回エラーで停止
    STATE_DETECTION_PATTERNS: [     // より堅牢な状態検出
      '実行を開始しました',
      '🚀 **実行を開始しました！**',
      'バックグラウンドで実行中です',
      '実行ID:.*running'
    ],
  },
  
  errorHandling: {
    MAX_RETRIES: 3,
    RETRY_DELAYS_MS: [1000, 2000, 4000],
    ENABLE_FALLBACK: true,
    LOG_ERRORS: true,
  },
  
  development: {
    ENABLE_COMPREHENSIVE_LOGGING: false,
    MOCK_EXTERNAL_APIS: false,
    BYPASS_RATE_LIMITS: false,
  }
};

// 開発環境用の設定
const DEVELOPMENT_CONFIG: SystemConfig = {
  ...PRODUCTION_CONFIG,
  content: {
    ...PRODUCTION_CONFIG.content,
    ENABLE_DEBUG_LOGGING: true,     // 開発時は詳細ログ
  },
  
  development: {
    ENABLE_COMPREHENSIVE_LOGGING: true,
    MOCK_EXTERNAL_APIS: false,      // 必要に応じて有効化
    BYPASS_RATE_LIMITS: false,
  }
};

// 環境に応じた設定選択
function getEnvironmentConfig(): SystemConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isProduction) {
    return PRODUCTION_CONFIG;
  } else if (isDevelopment) {
    return DEVELOPMENT_CONFIG;
  } else {
    // デフォルトは本番設定を使用（安全側に倒す）
    return PRODUCTION_CONFIG;
  }
}

// 環境変数による設定オーバーライド
function applyEnvironmentOverrides(config: SystemConfig): SystemConfig {
  const overrides: Partial<SystemConfig> = {};
  
  // 環境変数からの設定上書き
  if (process.env.FORCE_AI_PROCESSING !== undefined) {
    overrides.content = {
      ...config.content,
      FORCE_AI_PROCESSING: process.env.FORCE_AI_PROCESSING === 'true'
    };
  }
  
  if (process.env.GOOGLE_SEARCH_MAX_RESULTS) {
    overrides.api = {
      ...config.api,
      GOOGLE_SEARCH_MAX_RESULTS: parseInt(process.env.GOOGLE_SEARCH_MAX_RESULTS, 10)
    };
  }
  
  if (process.env.POLLING_INTERVAL_MS) {
    overrides.polling = {
      ...config.polling,
      INTERVAL_MS: parseInt(process.env.POLLING_INTERVAL_MS, 10)
    };
  }
  
  return { ...config, ...overrides };
}

// シングルトン設定インスタンス
class SystemConfigManager {
  private _config: SystemConfig;
  
  constructor() {
    this._config = applyEnvironmentOverrides(getEnvironmentConfig());
    
    // 設定値をログ出力（開発時のみ）
    if (this._config.development.ENABLE_COMPREHENSIVE_LOGGING) {
      console.log('🔧 System configuration loaded:', {
        environment: process.env.NODE_ENV || 'unknown',
        forceAIProcessing: this._config.content.FORCE_AI_PROCESSING,
        maxSearchResults: this._config.api.GOOGLE_SEARCH_MAX_RESULTS,
        pollingInterval: this._config.polling.INTERVAL_MS
      });
    }
  }
  
  get config(): SystemConfig {
    return this._config;
  }
  
  // 設定の動的更新（テスト用）
  updateConfig(updates: Partial<SystemConfig>): void {
    this._config = { ...this._config, ...updates };
    if (this._config.development.ENABLE_COMPREHENSIVE_LOGGING) {
      console.log('🔧 System configuration updated:', updates);
    }
  }
  
  // 特定設定の取得（便利メソッド）
  shouldForceAIProcessing(): boolean {
    return this._config.content.FORCE_AI_PROCESSING;
  }
  
  getMaxSearchResults(): number {
    return this._config.api.GOOGLE_SEARCH_MAX_RESULTS;
  }
  
  getPollingConfig(): SystemConfig['polling'] {
    return this._config.polling;
  }
  
  getContentConfig(): SystemConfig['content'] {
    return this._config.content;
  }
  
  getErrorHandlingConfig(): SystemConfig['errorHandling'] {
    return this._config.errorHandling;
  }
  
  // デバッグ情報の出力
  dumpConfig(): void {
    console.log('🔧 Full system configuration:', JSON.stringify(this._config, null, 2));
  }
}

// エクスポート
export const systemConfig = new SystemConfigManager();

// 便利な関数エクスポート
export const getConfig = () => systemConfig.config;
export const shouldForceAIProcessing = () => systemConfig.shouldForceAIProcessing();
export const getMaxSearchResults = () => systemConfig.getMaxSearchResults();
export const getPollingConfig = () => systemConfig.getPollingConfig();

// 設定検証関数
export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = systemConfig.config;
  const errors: string[] = [];
  
  // 必須API設定の検証
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is not configured');
  }
  
  if (!process.env.GOOGLE_API_KEY && config.api.GOOGLE_SEARCH_MAX_RESULTS > 0) {
    errors.push('GOOGLE_API_KEY is required when Google search is enabled');
  }
  
  // 設定値の妥当性検証
  if (config.api.GOOGLE_SEARCH_MAX_RESULTS > 10) {
    errors.push('GOOGLE_SEARCH_MAX_RESULTS should not exceed 10 (API limitation)');
  }
  
  if (config.polling.INTERVAL_MS < 1000) {
    errors.push('POLLING_INTERVAL_MS should be at least 1000ms');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}