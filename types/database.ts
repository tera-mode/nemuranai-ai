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
  | 'secretary' | 'strategy' | 'designer' | 'writer';

// ユーザープロファイル
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  subscription: 'free' | 'basic' | 'premium';
  createdAt: Date;
  lastLogin: Date;
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