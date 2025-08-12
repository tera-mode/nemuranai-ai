// JobSpec related type definitions for Spec Builder system

// 出力モード定義
export type SpecBuilderMode = 'form' | 'spec';

// 質問フィールドタイプ
export type QuestionFieldType = 'text' | 'select' | 'multi_select' | 'boolean' | 'date_range' | 'number';

// 質問定義
export interface Question {
  id: string;
  label: string;
  type: QuestionFieldType;
  required: boolean;
  options?: string[];
  default?: string;
  hint?: string;
}

// フォームモード出力
export interface FormModeOutput {
  mode: 'form';
  plan_brief: string;
  questions: Question[];
  assumptions_if_empty: string[];
}

// タスクタイプ定義
export type TaskType = 'research' | 'analysis' | 'generation' | 'visualization' | 'mixed';

// 成果物タイプ定義
export type DeliverableType = 'report' | 'table' | 'image' | 'code' | 'slides';
export type DeliverableFormat = 'md' | 'csv' | 'png' | 'py' | 'pptx' | 'json' | 'html' | 'pdf';

// 成果物定義
export interface Deliverable {
  type: DeliverableType;
  format: DeliverableFormat;
  schema_or_outline?: string[];
}

// プライバシーレベル定義
export type PrivacyLevel = 'no-PII' | 'internal-only' | 'public-ok';

// 制約条件
export interface JobConstraints {
  time_range?: string | null;
  languages: string[];
  domains_allow: string[];
  domains_block: string[];
  privacy: PrivacyLevel;
  budget_tokens: number;
  deadline_hint?: string | null;
}

// 入力データ定義
export interface JobInputs {
  seed_queries: string[];
  seed_urls: string[];
  datasets: string[];
}

// JobSpec定義（メイン）
export interface JobSpec {
  task_id: string;
  user_intent: string;
  goal: string;
  task_type: TaskType;
  deliverables: Deliverable[];
  inputs: JobInputs;
  constraints: JobConstraints;
  acceptance_criteria: string[];
  notes: string[];
}

// Specモード出力
export interface SpecModeOutput {
  mode: 'spec';
  job_spec: JobSpec;
  summary: string[];
  next_actions: string[];
}

// 統合出力タイプ
export type SpecBuilderOutput = FormModeOutput | SpecModeOutput;

// セッション状態管理
export type SpecBuilderSessionStatus = 
  | 'gathering_requirements' 
  | 'confirming_requirements' 
  | 'completed' 
  | 'failed';

// Spec Builderセッション
export interface SpecBuilderSession {
  id: string;
  threadId: string;
  userId: string;
  status: SpecBuilderSessionStatus;
  user_request: string;
  questions: Question[];
  user_answers: Record<string, any>;
  job_spec?: JobSpec;
  created_at: Date;
  updated_at: Date;
}

// ユーザー回答
export interface UserAnswers {
  [questionId: string]: string | string[] | boolean | number;
}