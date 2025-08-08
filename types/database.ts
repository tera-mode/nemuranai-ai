// キャラクター種族の定義
export type CharacterRace = 'dragon' | 'elf' | 'android' | 'ghost' | 'mage' | 'genius';

// キャラクター性格タイプ
export type PersonalityType = 
  | 'tsundere' | 'kuudere' | 'dandere' | 'genki' 
  | 'serious' | 'mysterious' | 'innocent' | 'cool';

// ビジネス専門分野
export type BusinessDomain = 
  | 'sales' | 'marketing' | 'support' | 'analysis' 
  | 'secretary' | 'strategy' | 'hr' | 'finance';

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
  race: CharacterRace;
  personality: PersonalityType;
  domain: BusinessDomain;
  appearance: {
    hairColor: string;
    eyeColor: string;
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