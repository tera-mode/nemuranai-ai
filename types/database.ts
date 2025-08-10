// キャラクター種族の定義
export type CharacterRace = 'human' | 'dragon' | 'elf' | 'android' | 'ghost' | 'mage' | 'dog' | 'cat' | 'knight' | 'ninja';

// キャラクター性別
export type CharacterGender = 'male' | 'female' | 'non-binary';

// キャラクター年齢層
export type CharacterAge = 'young' | 'adult' | 'elder';

// 肌の色
export type SkinTone = 'pinkish' | 'fair' | 'light' | 'medium' | 'olive' | 'brown' | 'dark' | 'deep';

// キャラクター性格タイプ
export type PersonalityType = 
  | 'tsundere' | 'kuudere' | 'genki' | 'yandere' | 'oneesan' | 'imouto'
  | 'landmine' | 'wild';

// ビジネス専門分野
export type BusinessDomain = 
  | 'sales' | 'marketing' | 'support' | 'analysis' 
  | 'secretary' | 'strategy' | 'designer' | 'writer'
  | 'fortune-teller' | 'trainer' | 'health-enthusiast' | 'legal-expert';

// ユーザープロファイル
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  subscription: 'free' | 'premium';
  createdAt: Date;
  lastLogin: Date;
  // 課金機能関連
  summonContracts: number;          // 召喚契約書の枚数
  stamina: number;                  // スタミナ
  maxStamina: number;              // 最大スタミナ（プランによって変わる）
  lastStaminaRecovery: Date;       // 最後のスタミナ回復時刻
  stripeCustomerId?: string;       // Stripe顧客ID
  subscriptionStatus: 'inactive' | 'active' | 'past_due' | 'canceled';
  subscriptionId?: string;         // StripeサブスクリプションID
  subscriptionStartDate?: Date;    // サブスクリプション開始日
  subscriptionEndDate?: Date;      // サブスクリプション終了日
  isAdmin?: boolean;              // 管理者権限
}

// AIキャラクター定義
export interface AICharacter {
  id: string;
  userId: string;
  name: string;
  gender: CharacterGender;
  race: CharacterRace;
  age: CharacterAge;
  skinTone: SkinTone;
  personality: PersonalityType;
  domain: BusinessDomain;
  appearance: {
    themeColor: string;
    outfit: string;
    accessories: string[];
  };
  backstory: string;
  level: number;
  experience: number;
  stats: {
    efficiency: number;
    creativity: number;
    empathy: number;
    accuracy: number;
  };
  createdAt: Date;
  isActive: boolean;
  profileImageUrl?: string; // プロフィール画像URL
}

// チャットスレッド
export interface ChatThread {
  id: string;
  userId: string;
  characterId: string;
  title: string; // 自動生成されるスレッドタイトル
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage: string; // プレビュー用
}

// チャットメッセージ（スレッド内）
export interface ChatMessage {
  id: string;
  threadId: string;
  characterId: string;
  userId: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  isMarkdown?: boolean; // マークダウン形式かどうか
  images?: string[]; // 画像URL配列
}

// Brain AI知識ベース
export interface KnowledgeItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'text' | 'document' | 'url';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 課金システム関連の型定義
export interface BillingTransaction {
  id: string;
  userId: string;
  type: 'subscription' | 'one_time_purchase';
  productType: 'premium_plan' | 'summon_contracts' | 'stamina_recovery';
  amount: number;                 // 金額（円）
  quantity: number;              // 数量
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  completedAt?: Date;
}

export interface ProductPrice {
  id: string;
  productType: 'premium_plan' | 'summon_contracts' | 'stamina_recovery';
  name: string;
  description: string;
  price: number;                 // 価格（円）
  quantity: number;              // 提供される数量
  stripePriceId: string;        // StripeのPrice ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// プラン設定
export const PLAN_SETTINGS = {
  free: {
    initialSummonContracts: 5,
    initialStamina: 20,
    maxStamina: 50,
    dailyStaminaRecovery: 10,
    monthlyBonusSummonContracts: 0,
    monthlyBonusStamina: 0
  },
  premium: {
    initialSummonContracts: 25,    // 購入時5枚 + ボーナス20枚
    initialStamina: 220,           // 購入時20 + ボーナス200
    maxStamina: 500,
    dailyStaminaRecovery: 10,
    monthlyBonusSummonContracts: 20,
    monthlyBonusStamina: 200
  }
} as const;

// 商品価格設定
export const PRODUCT_PRICES = {
  premium_plan: 1980,         // 月額1980円
  summon_contracts_10: 800,   // 召喚契約書10枚で800円
  stamina_recovery_100: 800   // スタミナ回復100で800円
} as const;