import { Timestamp } from 'firebase/firestore';

// ブランド定義
export interface Brand {
  id?: string;
  name: string;
  styleTokens: {
    palette: string[];
    fonts: string[];
    tone: string;
  };
  createdBy: string;
  createdAt: Date | Timestamp;
}

// デザインジョブ
export type UseCase = 'logo' | 'hero_bg' | 'social_banner' | 'ad_creative' | 'product_kv';
export type JobStatus = 'queued' | 'running' | 'need_approval' | 'approved' | 'rejected' | 'failed';
export type AutonomyLevel = 'propose' | 'draft' | 'auto';

export interface DesignJob {
  id?: string;
  brandId: string;
  useCase: UseCase;
  brief: LogoBrief | HeroBgBrief;
  status: JobStatus;
  autonomy: AutonomyLevel;
  variantIds: string[];
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// ブリーフ型定義
export interface LogoBrief {
  layout: 'wide' | 'square' | 'tall';
  twoLine: boolean;
  text: string;
  vibe: 'bright' | 'fantasy' | 'professional' | 'playful';
  palette: string[];
  textMode: 'overlay' | 'side' | 'bottom';
  symbolHint: string;
}

export interface HeroBgBrief {
  theme: 'bright_fantasy_office' | 'professional' | 'creative' | 'tech';
  elements: string[];
  avoid: string[];
  aspectRatio: '16:9' | '21:9' | '4:3' | 'square';
}

// アーティファクト（生成物）
export interface Artifact {
  id?: string;
  jobId: string;
  type: 'image' | 'document';
  storagePath: string;
  previewUrl: string;
  w: number;
  h: number;
  size: number;
  seed?: number;
  model?: string;
  promptHash?: string;
  postProcess?: Record<string, any>;
  createdAt: Date | Timestamp;
}

// 実行ログ
export type RunStep = 'prompt.build' | 'stability.generate' | 'compose.canvas' | 'post.sharp';
export type RunStatus = 'ok' | 'error';

export interface Run {
  id?: string;
  jobId: string;
  step: RunStep;
  inputHash: string;
  outputHash?: string;
  durationMs: number;
  cost?: number;
  status: RunStatus;
  error?: string;
  createdAt: Date | Timestamp;
}

// テンプレート定義
export interface TemplateStep {
  tool: string;
  with: Record<string, any>;
  repeat?: number;
}

export interface DesignTemplate {
  useCase: UseCase;
  steps: TemplateStep[];
}

// API レスポンス型
export interface JobCreationRequest {
  brandId: string;
  useCase: UseCase;
  brief: string; // 自然文
  autonomy: AutonomyLevel;
}

export interface JobCreationResponse {
  jobId: string;
  status: JobStatus;
  briefSummary: LogoBrief | HeroBgBrief;
}