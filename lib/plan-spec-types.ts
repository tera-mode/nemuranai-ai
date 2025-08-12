// PlanSpec related type definitions for Planner/Router system

import { JobSpec } from '@/lib/job-spec-types';

// スキルレジストリ定義
export interface SkillModule {
  name: string;
  description: string;
  inputs_schema: Record<string, any>;
  outputs_schema: Record<string, any>;
  preconditions: string[];
  risk: string[];
  cost_estimate: 'low' | 'mid' | 'high';
  category: 'search' | 'fetch' | 'analyze' | 'generate' | 'transform' | 'synthesize';
}

// ノード定義
export interface PlanNode {
  id: string;
  title: string;
  purpose: string;
  module: string;
  params: Record<string, any>;
  inputs: Array<{
    from: string | null;
    contract: string;
  }>;
  outputs: Array<{
    contract: string;
    artifact_type: string;
  }>;
  preconditions: string[];
  fallbacks: string[];
  estimates: {
    latency_ms_p50: number;
    tokens: number;
    cost_hint: 'low' | 'mid' | 'high';
  };
  risks: string[];
}

// エッジ定義
export interface PlanEdge {
  from: string;
  to: string;
  why: string;
}

// グラフ定義
export interface PlanGraph {
  nodes: PlanNode[];
  edges: PlanEdge[];
}

// ポリシーチェック
export interface PolicyChecks {
  domains_allow: string[];
  domains_block: string[];
  privacy: 'no-PII' | 'internal-only' | 'public-ok';
  violations: string[];
}

// 検収条件カバレッジ
export interface AcceptanceCoverage {
  criterion: string;
  satisfied_by_nodes: string[];
  gaps: string[];
}

// 成果物バインディング
export interface DeliverableBinding {
  deliverable: {
    type: string;
    format: string;
  };
  produced_by: string;
}

// PlanSpec（メイン）
export interface PlanSpec {
  task_id: string;
  summary: string;
  graph: PlanGraph;
  parallelism: 'none' | 'safe' | 'aggressive';
  policy_checks: PolicyChecks;
  coverage_to_acceptance: AcceptanceCoverage[];
  deliverable_binding: DeliverableBinding[];
  assumptions: string[];
  open_issues: string[];
}

// 入力：計画リクエスト
export interface PlanRequest {
  mode: 'plan_request';
  job_spec: JobSpec;
  skill_registry: SkillModule[];
}

// 出力：計画レスポンス
export interface PlanResponse {
  mode: 'plan';
  plan_spec: PlanSpec;
  summary_text: string; // 人間向けサマリー
}

// プランナーセッション状態
export type PlannerSessionStatus = 
  | 'gathering_plan' 
  | 'plan_ready' 
  | 'plan_approved'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'failed';

// プランナーセッション
export interface PlannerSession {
  id: string;
  threadId: string;
  userId: string;
  status: PlannerSessionStatus;
  job_spec: JobSpec;
  plan_spec?: PlanSpec;
  skill_registry: SkillModule[];
  created_at: Date;
  updated_at: Date;
}

// デフォルトスキルレジストリ
export const DEFAULT_SKILL_REGISTRY: SkillModule[] = [
  {
    name: 'search_web',
    description: 'ウェブ検索でURLを収集',
    inputs_schema: {
      query: 'string',
      num: 'number',
      allow_domains: 'string[]'
    },
    outputs_schema: {
      urls: 'UrlInfo[]'
    },
    preconditions: ['robots_txt_allows'],
    risk: ['legal:low'],
    cost_estimate: 'low',
    category: 'search'
  },
  {
    name: 'fetch_extract',
    description: 'URLから本文とメタデータを抽出',
    inputs_schema: {
      urls: 'UrlInfo[]',
      render: 'boolean'
    },
    outputs_schema: {
      documents: 'DocumentInfo[]'
    },
    preconditions: ['no_login_required'],
    risk: ['legal:low'],
    cost_estimate: 'low',
    category: 'fetch'
  },
  {
    name: 'fetch_extract_rendered',
    description: 'JavaScript実行が必要なページの本文抽出',
    inputs_schema: {
      urls: 'UrlInfo[]'
    },
    outputs_schema: {
      documents: 'DocumentInfo[]'
    },
    preconditions: ['no_login_required'],
    risk: ['legal:low'],
    cost_estimate: 'mid',
    category: 'fetch'
  },
  {
    name: 'normalize_dedupe',
    description: '重複除去と正規化',
    inputs_schema: {
      documents: 'DocumentInfo[]'
    },
    outputs_schema: {
      clean_documents: 'DocumentInfo[]'
    },
    preconditions: [],
    risk: [],
    cost_estimate: 'low',
    category: 'transform'
  },
  {
    name: 'structure_findings',
    description: '要点抽出と根拠紐づけ',
    inputs_schema: {
      documents: 'DocumentInfo[]',
      max_claims: 'number'
    },
    outputs_schema: {
      findings: 'FindingInfo[]'
    },
    preconditions: [],
    risk: [],
    cost_estimate: 'low',
    category: 'analyze'
  },
  {
    name: 'synthesize_report',
    description: 'レポート形式に整形',
    inputs_schema: {
      findings: 'FindingInfo[]',
      format: 'string'
    },
    outputs_schema: {
      report: 'ReportInfo'
    },
    preconditions: [],
    risk: [],
    cost_estimate: 'low',
    category: 'synthesize'
  },
  {
    name: 'py_analyze',
    description: 'Python分析処理',
    inputs_schema: {
      data: 'DataInfo[]',
      analysis_type: 'string'
    },
    outputs_schema: {
      analysis_result: 'AnalysisInfo'
    },
    preconditions: [],
    risk: [],
    cost_estimate: 'mid',
    category: 'analyze'
  },
  {
    name: 'visualize',
    description: 'データ可視化',
    inputs_schema: {
      data: 'any',
      chart_type: 'string'
    },
    outputs_schema: {
      chart: 'ChartInfo'
    },
    preconditions: [],
    risk: [],
    cost_estimate: 'low',
    category: 'generate'
  }
];

// ルーティングパターン定義
export const ROUTING_PATTERNS = {
  research: [
    'search_web',
    'fetch_extract', 
    'normalize_dedupe',
    'structure_findings',
    'synthesize_report'
  ],
  analysis: [
    'search_web',        // データ分析でもまずは調査から
    'fetch_extract',
    'normalize_dedupe', 
    'py_analyze',
    'visualize',
    'synthesize_report'
  ],
  generation: [
    'search_web',       // 生成でも参考情報が必要
    'fetch_extract',
    'structure_findings',
    'synthesize_report'
  ],
  visualization: [
    'py_analyze',
    'visualize',
    'synthesize_report'
  ],
  mixed: [
    'search_web',
    'fetch_extract',
    'normalize_dedupe',
    'structure_findings',
    'py_analyze',
    'visualize', 
    'synthesize_report'
  ]
} as const;