// Planner - 計画作成とモジュール選定システム
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import {
  PlannerSession,
  PlannerSessionStatus,
  PlanSpec,
  PlanNode,
  PlanEdge,
  SkillModule,
  PlanRequest,
  PlanResponse,
  AcceptanceCoverage,
  DeliverableBinding,
  DEFAULT_SKILL_REGISTRY,
  ROUTING_PATTERNS
} from '@/lib/plan-spec-types';
import { JobSpec, TaskType } from '@/lib/job-spec-types';

// UUID生成（既存パターンと同じ）
function generateUuid(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class PlannerManager {
  // セッション作成
  static async createSession(threadId: string, userId: string, jobSpec: JobSpec): Promise<PlannerSession> {
    const sessionData: Omit<PlannerSession, 'id'> = {
      threadId,
      userId,
      status: 'gathering_plan',
      job_spec: jobSpec,
      skill_registry: DEFAULT_SKILL_REGISTRY,
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await addDoc(collection(db, 'planner_sessions'), sessionData);
    return {
      id: docRef.id,
      ...sessionData
    };
  }

  // セッション取得（スレッドID基準）
  static async getSessionByThread(threadId: string): Promise<PlannerSession | null> {
    try {
      const q = query(
        collection(db, 'planner_sessions'),
        where('threadId', '==', threadId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // 最新のセッションを取得
      const sessions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : data.created_at,
          updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : data.updated_at,
        } as PlannerSession;
      });

      return sessions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
    } catch (error) {
      console.error('Error getting planner session:', error);
      return null;
    }
  }

  // セッション更新
  static async updateSession(sessionId: string, updates: Partial<PlannerSession>): Promise<void> {
    try {
      const docRef = doc(db, 'planner_sessions', sessionId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error updating planner session:', error);
      throw error;
    }
  }

  // PlanSpec生成
  static generatePlanSpec(jobSpec: JobSpec, skillRegistry: SkillModule[]): PlanSpec {
    console.log('🎯 Generating plan spec for task:', jobSpec.task_type);

    // タスクタイプに基づくルーティングパターン選択
    const routingPattern = this.selectRoutingPattern(jobSpec.task_type);
    console.log('📋 Selected routing pattern:', routingPattern);

    // ノード生成
    const nodes = this.generateNodes(jobSpec, routingPattern, skillRegistry);
    console.log('🔗 Generated nodes:', nodes.length);

    // エッジ生成
    const edges = this.generateEdges(nodes, routingPattern);
    console.log('⚡ Generated edges:', edges.length);

    // 検収条件カバレッジ計算
    const coverage = this.calculateAcceptanceCoverage(jobSpec, nodes);

    // 成果物バインディング
    const deliverableBinding = this.generateDeliverableBinding(jobSpec, nodes);

    // PlanSpec構築
    const planSpec: PlanSpec = {
      task_id: jobSpec.task_id,
      summary: this.generateSummary(jobSpec, routingPattern),
      graph: {
        nodes,
        edges
      },
      parallelism: 'safe', // 安全な並列度
      policy_checks: {
        domains_allow: jobSpec.constraints.domains_allow,
        domains_block: jobSpec.constraints.domains_block,
        privacy: jobSpec.constraints.privacy,
        violations: []
      },
      coverage_to_acceptance: coverage,
      deliverable_binding: deliverableBinding,
      assumptions: this.generateAssumptions(jobSpec),
      open_issues: this.generateOpenIssues(jobSpec)
    };

    console.log('✅ Plan spec generated successfully');
    return planSpec;
  }

  // ルーティングパターン選択
  private static selectRoutingPattern(taskType: TaskType): string[] {
    const patterns = {
      'research': ROUTING_PATTERNS.research,
      'analysis': ROUTING_PATTERNS.analysis,
      'generation': ROUTING_PATTERNS.generation,
      'visualization': ROUTING_PATTERNS.visualization,
      'customer_support': ROUTING_PATTERNS.customer_support,
      'lead_generation': ROUTING_PATTERNS.lead_generation,
      'seo_content': ROUTING_PATTERNS.seo_content,
      'data_processing': ROUTING_PATTERNS.data_processing,
      'social_media': ROUTING_PATTERNS.social_media,
      'mixed': ROUTING_PATTERNS.mixed
    } as const;

    return [...(patterns[taskType] || ROUTING_PATTERNS.mixed)];
  }

  // ノード生成
  private static generateNodes(jobSpec: JobSpec, pattern: string[], skillRegistry: SkillModule[]): PlanNode[] {
    const nodes: PlanNode[] = [];
    let nodeCounter = 1;

    pattern.forEach((skillName) => {
      const skill = skillRegistry.find(s => s.name === skillName);
      if (!skill) {
        console.warn(`Skill not found: ${skillName}`);
        return;
      }

      const nodeId = `n${nodeCounter++}`;
      const node: PlanNode = {
        id: nodeId,
        title: this.generateNodeTitle(skill),
        purpose: skill.description,
        module: skill.name,
        params: this.generateNodeParams(skill, jobSpec),
        inputs: this.generateNodeInputs(skill, nodeId, nodes),
        outputs: this.generateNodeOutputs(skill),
        preconditions: skill.preconditions,
        fallbacks: this.generateFallbacks(skill),
        estimates: {
          latency_ms_p50: this.estimateLatency(skill),
          tokens: this.estimateTokens(skill),
          cost_hint: skill.cost_estimate
        },
        risks: skill.risk
      };

      nodes.push(node);
    });

    return nodes;
  }

  // エッジ生成
  private static generateEdges(nodes: PlanNode[], pattern: string[]): PlanEdge[] {
    const edges: PlanEdge[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const fromNode = nodes[i];
      const toNode = nodes[i + 1];

      edges.push({
        from: fromNode.id,
        to: toNode.id,
        why: this.generateEdgeReason(fromNode, toNode)
      });
    }

    // 並列処理のエッジ（研究系の場合）
    if (pattern.includes('search_web') && nodes.length >= 3) {
      // 検索結果を複数フェッチに並列分岐
      edges.push({
        from: 'n1', // search_web
        to: 'n3',   // 直接fetch_extractへ
        why: 'URL並列取得'
      });
    }

    return edges;
  }

  // 検収条件カバレッジ計算
  private static calculateAcceptanceCoverage(jobSpec: JobSpec, nodes: PlanNode[]): AcceptanceCoverage[] {
    return jobSpec.acceptance_criteria.map(criterion => {
      const satisfyingNodes = this.findNodesSatisfyingCriterion(criterion, nodes);
      return {
        criterion,
        satisfied_by_nodes: satisfyingNodes,
        gaps: satisfyingNodes.length === 0 ? ['要対応'] : []
      };
    });
  }

  // 成果物バインディング生成
  private static generateDeliverableBinding(jobSpec: JobSpec, nodes: PlanNode[]): DeliverableBinding[] {
    return jobSpec.deliverables.map(deliverable => {
      const producingNode = nodes.find(n => 
        n.module === 'synthesize_report' || 
        n.module.includes('generate') ||
        n.module.includes('visualize')
      );

      return {
        deliverable: {
          type: deliverable.type,
          format: deliverable.format
        },
        produced_by: producingNode?.id || nodes[nodes.length - 1].id
      };
    });
  }

  // ヘルパーメソッド群
  private static generateNodeTitle(skill: SkillModule): string {
    const titles: Record<string, string> = {
      'search_web': '候補URL検索',
      'fetch_extract': '本文取得・抽出',
      'normalize_dedupe': '正規化・重複排除',
      'structure_findings': '要点抽出・根拠紐づけ',
      'synthesize_report': 'レポート整形',
      'py_analyze': 'Python分析',
      'visualize': 'データ可視化'
    };
    return titles[skill.name] || skill.name;
  }

  private static generateNodeParams(skill: SkillModule, jobSpec: JobSpec): Record<string, any> {
    // Extract search query from user intent
    const extractSearchQuery = (userIntent: string): string => {
      // Remove common search phrases to get the actual query
      return userIntent
        .replace(/について詳しく調べて$/, '')
        .replace(/について調べて$/, '')
        .replace(/を詳しく調べて$/, '')
        .replace(/を調べて$/, '')  
        .replace(/の情報を$/, '')
        .replace(/について$/, '')
        .trim();
    };

    const baseParams: Record<string, Record<string, any>> = {
      'search_web': {
        query: extractSearchQuery(jobSpec.user_intent),
        num: 6,
        allow_domains: jobSpec.constraints.domains_allow
      },
      'fetch_extract': {
        render: false
      },
      'structure_findings': {
        max_claims: 8
      },
      'synthesize_report': {
        format: jobSpec.deliverables[0]?.format || 'md'
      }
    };

    return baseParams[skill.name] || {};
  }

  private static generateNodeInputs(skill: SkillModule, nodeId: string, existingNodes: PlanNode[]): Array<{ from: string | null; contract: string }> {
    if (existingNodes.length === 0) {
      return [{ from: null, contract: 'initial_input' }];
    }
    
    const previousNode = existingNodes[existingNodes.length - 1];
    const outputContract = previousNode.outputs[0]?.contract || 'unknown';
    
    return [{ from: previousNode.id, contract: outputContract }];
  }

  private static generateNodeOutputs(skill: SkillModule): Array<{ contract: string; artifact_type: string }> {
    const outputs: Record<string, Array<{ contract: string; artifact_type: string }>> = {
      'search_web': [{ contract: 'urls.list', artifact_type: 'json' }],
      'fetch_extract': [{ contract: 'docs.list', artifact_type: 'json' }],
      'normalize_dedupe': [{ contract: 'docs.clean', artifact_type: 'json' }],
      'structure_findings': [{ contract: 'findings.json', artifact_type: 'json' }],
      'synthesize_report': [{ contract: 'report.md', artifact_type: 'md' }],
      'py_analyze': [{ contract: 'analysis.json', artifact_type: 'json' }],
      'visualize': [{ contract: 'chart.png', artifact_type: 'png' }]
    };

    return outputs[skill.name] || [{ contract: 'output', artifact_type: 'json' }];
  }

  private static generateFallbacks(skill: SkillModule): string[] {
    const fallbacks: Record<string, string[]> = {
      'search_web': ['search_web_lite'],
      'fetch_extract': ['fetch_extract_rendered'],
      'structure_findings': ['structure_findings_lite'],
      'synthesize_report': ['synthesize_report_lite']
    };

    return fallbacks[skill.name] || [];
  }

  private static estimateLatency(skill: SkillModule): number {
    const estimates: Record<string, number> = {
      'search_web': 1500,
      'fetch_extract': 3000,
      'normalize_dedupe': 800,
      'structure_findings': 1200,
      'synthesize_report': 900,
      'py_analyze': 2000,
      'visualize': 1000
    };

    return estimates[skill.name] || 1000;
  }

  private static estimateTokens(skill: SkillModule): number {
    const estimates: Record<string, number> = {
      'search_web': 0,
      'fetch_extract': 0,
      'normalize_dedupe': 0,
      'structure_findings': 4000,
      'synthesize_report': 2500,
      'py_analyze': 1000,
      'visualize': 500
    };

    return estimates[skill.name] || 0;
  }

  private static generateEdgeReason(fromNode: PlanNode, toNode: PlanNode): string {
    const reasons: Record<string, string> = {
      'search_web->fetch_extract': 'URLが必要',
      'fetch_extract->normalize_dedupe': '品質向上のため',
      'normalize_dedupe->structure_findings': '要点抽出の前処理',
      'structure_findings->synthesize_report': '最終整形のため'
    };

    const key = `${fromNode.module}->${toNode.module}`;
    return reasons[key] || '処理依存';
  }

  private static findNodesSatisfyingCriterion(criterion: string, nodes: PlanNode[]): string[] {
    const criterionLower = criterion.toLowerCase();
    
    if (criterionLower.includes('出典') || criterionLower.includes('url')) {
      return nodes.filter(n => 
        n.module === 'structure_findings' || 
        n.module === 'synthesize_report'
      ).map(n => n.id);
    }
    
    if (criterionLower.includes('日付') || criterionLower.includes('iso8601')) {
      return nodes.filter(n => n.module === 'synthesize_report').map(n => n.id);
    }

    // デフォルト：最終ノードが満たす
    return nodes.length > 0 ? [nodes[nodes.length - 1].id] : [];
  }

  private static generateSummary(jobSpec: JobSpec, pattern: string[]): string {
    const patternDesc = pattern.includes('search_web') 
      ? '公式サイトとニュースからの一次情報を核に'
      : 'データ分析を中心に';
    
    const deliverableDesc = jobSpec.deliverables[0]?.format === 'md' 
      ? 'Markdownレポート'
      : '指定形式の成果物';

    return `${patternDesc}、引用付き${deliverableDesc}を作成するMVP計画。`;
  }

  private static generateAssumptions(jobSpec: JobSpec): string[] {
    const assumptions = [];
    
    if (!jobSpec.constraints.time_range) {
      assumptions.push('期間指定なし→過去12ヶ月を想定（実行段階で上書き可能）');
    }
    
    if (jobSpec.constraints.domains_allow.length === 0) {
      assumptions.push('ドメイン制限なし→公式サイト優先で進行');
    }

    return assumptions;
  }

  private static generateOpenIssues(jobSpec: JobSpec): string[] {
    const issues = [];
    
    if (jobSpec.inputs.seed_urls.length === 0) {
      issues.push('シードURL未指定→検索結果に依存');
    }
    
    if (!jobSpec.constraints.deadline_hint) {
      issues.push('期限未指定→並列度調整が必要');
    }

    return issues;
  }
}