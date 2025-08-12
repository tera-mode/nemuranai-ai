// Runner/Executor related type definitions for execution stage

import { JobSpec } from '@/lib/job-spec-types';
import { PlanSpec } from '@/lib/plan-spec-types';

// 実行ステータス
export type RunStatus = 'success' | 'partial' | 'failed';
export type NodeStatus = 'success' | 'failed' | 'skipped';

// 進捗イベント型
export interface RunnerEvent {
  event: 'RUN_STARTED' | 'NODE_STARTED' | 'NODE_COMPLETED' | 'NODE_FAILED' | 'RUN_COMPLETED';
  run_id: string;
  ts: number;
  node_id?: string;
  title?: string;
  outputs?: string[];
  artifact_ids?: string[];
  error?: string;
  attempt?: number;
  status?: RunStatus;
}

// アーティファクト定義
export interface Artifact {
  id: string;
  type: 'json' | 'md' | 'csv' | 'png' | 'html' | 'txt';
  content: string;
  encoding: 'utf-8' | 'base64';
  url?: string;
  hash?: string;
  meta?: Record<string, any>;
  created_at: Date;
}

// プロブナンス（来歴）情報
export interface Provenance {
  source_url: string;
  retrieved_at: string;
  artifact_id: string;
  hash: string;
}

// ノード実行結果
export interface NodeResult {
  node_id: string;
  module: string;
  status: NodeStatus;
  attempts: number;
  inputs_ref: string[];
  outputs_ref: string[];
  logs: string[];
  error: string | null;
  duration_ms?: number;
  started_at?: Date;
  completed_at?: Date;
}

// 検収チェック結果
export interface AcceptanceCheck {
  criterion: string;
  pass: boolean;
  evidence_nodes: string[];
  details?: string;
}

// 成果物情報
export interface Deliverable {
  type: string;
  format: string;
  artifact_id: string;
  url: string;
  title?: string;
}

// 実行サマリー
export interface RunSummary {
  highlights: string[];
  caveats: string[];
  next_actions: string[];
}

// RunnerResult（最終出力）
export interface RunnerResult {
  mode: 'run_result';
  run_id: string;
  status: RunStatus;
  summary: RunSummary;
  deliverables: Deliverable[];
  node_results: NodeResult[];
  acceptance_check: AcceptanceCheck[];
  provenance: Provenance[];
  execution_time_ms: number;
  created_at: Date;
}

// 実行環境設定
export interface RunnerEnvironment {
  parallelism_defaults: {
    safe: number;
    aggressive: number;
    none: number;
  };
  retry: {
    max_retries: number;
    initial_backoff_ms: number;
    backoff_factor: number;
  };
  timeouts: {
    node_ms: number;
    run_ms: number;
  };
}

// 実行リクエスト
export interface RunRequest {
  mode: 'run_request';
  run_id: string;
  job_spec: JobSpec;
  plan_spec: PlanSpec;
  skill_registry: any[]; // SkillModule from plan-spec-types
  env?: RunnerEnvironment;
}

// ツール実行結果の基底型
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  artifacts?: string[];
}

// 具体的なツール結果型
export interface SearchResult {
  items: Array<{
    url: string;
    title: string;
    site: string;
    score: number;
    snippet?: string;
  }>;
}

export interface FetchResult {
  docs: Array<{
    url: string;
    title: string;
    content: string;
    published_at: string | null;
    author: string | null;
    meta: {
      og_title?: string;
      lang?: string;
      content_type?: string;
    };
    error?: string;
  }>;
}

export interface NormalizeResult {
  docs_clean: Array<{
    url: string;
    title: string;
    content: string;
    published_at: string | null;
    author: string | null;
    meta: Record<string, any>;
    dedup_key: string;
  }>;
}

export interface FindingsResult {
  findings: Array<{
    claim: string;
    support: Array<{
      url: string;
      title: string;
      published_at: string;
      snippet: string;
    }>;
    confidence: number;
  }>;
}

export interface SynthesizeResult {
  report_md: string;
  citations: Array<{
    url: string;
    title: string;
    published_at: string;
  }>;
}

// Runner実行セッション状態
export type RunnerSessionStatus = 
  | 'queued'
  | 'running' 
  | 'completed'
  | 'failed'
  | 'cancelled';

// Runnerセッション
export interface RunnerSession {
  id: string;
  run_id: string;
  thread_id: string;
  user_id: string;
  status: RunnerSessionStatus;
  job_spec: JobSpec;
  plan_spec: PlanSpec;
  current_node_id?: string;
  artifacts: Record<string, Artifact>;
  node_results: Record<string, NodeResult>;
  events: RunnerEvent[];
  result?: RunnerResult;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

// デフォルト実行環境
export const DEFAULT_RUNNER_ENVIRONMENT: RunnerEnvironment = {
  parallelism_defaults: {
    safe: 2,
    aggressive: 4,
    none: 1
  },
  retry: {
    max_retries: 2,
    initial_backoff_ms: 800,
    backoff_factor: 2.0
  },
  timeouts: {
    node_ms: 60000,  // 60秒（Claude API分析のため延長）
    run_ms: 1800000  // 30分
  }
};

// ツールパラメータ型
export interface SearchWebParams {
  query: string;
  num: number;
  allow_domains?: string[];
}

export interface FetchExtractParams {
  urls: string[];
  render?: boolean;
}

export interface NormalizeDedupeParams {
  docs: any[];
}

export interface StructureFindingsParams {
  docs: any[];
  max_claims?: number;
  acceptance_criteria?: string[];
}

export interface SynthesizeReportParams {
  findings: any[];
  format: string;
}

export interface PutArtifactParams {
  type: 'json' | 'md' | 'csv' | 'png' | 'html' | 'txt';
  content: string;
  encoding?: 'utf-8' | 'base64';
  meta?: Record<string, any>;
}