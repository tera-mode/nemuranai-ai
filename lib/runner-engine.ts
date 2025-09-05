// Runner Engine - DAG実行エンジンとエラーハンドリング

import { db } from '@/lib/firebase-client';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import {
  RunnerSession,
  RunnerEvent,
  NodeResult,
  RunnerResult,
  RunRequest,
  RunnerEnvironment,
  DEFAULT_RUNNER_ENVIRONMENT,
  AcceptanceCheck,
  Provenance,
  RunSummary,
  Deliverable
} from '@/lib/runner-types';
import { PlanNode } from '@/lib/plan-spec-types';
import { defaultToolRegistry } from '@/lib/runner-tools';
import { ArtifactStorage } from '@/lib/artifact-storage';

// UUID生成（既存パターンと同じ）
function generateUuid(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class RunnerEngine {
  private session: RunnerSession;
  private environment: RunnerEnvironment;
  private events: RunnerEvent[] = [];
  private nodeResults: Record<string, NodeResult> = {};
  private artifacts: Record<string, string> = {}; // node_id -> artifact_id mapping

  constructor(request: RunRequest) {
    this.environment = request.env || DEFAULT_RUNNER_ENVIRONMENT;
    
    this.session = {
      id: generateUuid(),
      run_id: request.run_id,
      thread_id: '', // will be set by caller
      user_id: '', // will be set by caller
      status: 'queued',
      job_spec: request.job_spec,
      plan_spec: request.plan_spec,
      artifacts: {},
      node_results: {},
      events: [],
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  // 実行開始
  async run(threadId: string, userId: string): Promise<RunnerResult> {
    this.session.thread_id = threadId;
    this.session.user_id = userId;
    this.session.status = 'running';
    this.session.started_at = new Date();

    const startTime = Date.now();

    try {
      console.log(`🚀 Starting run: ${this.session.run_id}`);
      
      // セッションをFirestoreに保存
      await this.saveSession();

      // 開始イベント発行
      await this.emitEvent({
        event: 'RUN_STARTED',
        run_id: this.session.run_id,
        ts: Date.now()
      });

      // 前提チェック
      await this.validatePreconditions();

      // DAGをトポロジカル順序で実行
      await this.executeDAG();

      // 成果物バインディング
      const deliverables = await this.createDeliverables();

      // 検収チェック
      const acceptanceCheck = await this.performAcceptanceCheck();

      // プロブナンス情報生成
      const provenance = await this.generateProvenance();

      // 実行結果生成
      const result: RunnerResult = {
        mode: 'run_result',
        run_id: this.session.run_id,
        status: this.determineOverallStatus(acceptanceCheck),
        summary: this.generateSummary(acceptanceCheck),
        deliverables,
        node_results: Object.values(this.nodeResults),
        acceptance_check: acceptanceCheck,
        provenance,
        execution_time_ms: Date.now() - startTime,
        created_at: new Date()
      };

      // セッション完了
      this.session.status = 'completed';
      this.session.completed_at = new Date();
      this.session.result = result;
      await this.saveSession();

      // 完了イベント発行
      await this.emitEvent({
        event: 'RUN_COMPLETED',
        run_id: this.session.run_id,
        status: result.status,
        ts: Date.now()
      });

      console.log(`✅ Run completed: ${this.session.run_id} (${result.status})`);
      return result;

    } catch (error) {
      console.error(`❌ Run failed: ${this.session.run_id}`, error);
      
      this.session.status = 'failed';
      this.session.completed_at = new Date();
      await this.saveSession();

      await this.emitEvent({
        event: 'RUN_COMPLETED',
        run_id: this.session.run_id,
        status: 'failed',
        ts: Date.now()
      });

      // 失敗時でも部分的な結果を返す
      return this.createFailureResult(error, Date.now() - startTime);
    }
  }

  // DAG実行
  private async executeDAG(): Promise<void> {
    const nodes = this.session.plan_spec.graph.nodes;
    const edges = this.session.plan_spec.graph.edges;

    if (!nodes || nodes.length === 0) {
      throw new Error('No nodes found in plan specification');
    }

    console.log(`📊 Executing DAG with ${nodes.length} nodes and ${edges?.length || 0} edges`);

    // トポロジカルソートでノード実行順序を決定
    const executionOrder = this.topologicalSort(nodes, edges);
    console.log(`📋 Execution order: ${executionOrder.join(' → ')}`);

    // 並列度設定
    const parallelism = this.environment.parallelism_defaults[
      this.session.plan_spec.parallelism || 'safe'
    ];
    
    console.log(`⚡ Parallelism level: ${parallelism}`);

    // 依存関係を正しく処理するDAG実行
    const inDegree: Record<string, number> = {};
    const graph: Record<string, string[]> = {};
    const completed = new Set<string>();

    // グラフ構築
    nodes.forEach(node => {
      inDegree[node.id] = 0;
      graph[node.id] = [];
    });

    edges.forEach(edge => {
      graph[edge.from].push(edge.to);
      inDegree[edge.to]++;
    });

    // 依存関係に基づく実行
    while (completed.size < nodes.length) {
      // 実行可能なノードを特定（依存関係が満たされているもの）
      const readyNodes = Object.keys(inDegree).filter(nodeId => 
        inDegree[nodeId] === 0 && !completed.has(nodeId)
      );

      if (readyNodes.length === 0) {
        throw new Error('Circular dependency detected or no executable nodes');
      }

      console.log(`🚀 Ready to execute: ${readyNodes.join(', ')}`);

      // 並列度を考慮して実行
      const batchSize = Math.min(parallelism, readyNodes.length);
      const currentBatch = readyNodes.slice(0, batchSize);
      
      // バッチを並列実行
      await Promise.all(
        currentBatch.map(async nodeId => {
          await this.executeNode(nodeId);
          completed.add(nodeId);
          
          // 完了したノードに依存していたノードの依存度を減らす
          graph[nodeId].forEach(dependentNode => {
            inDegree[dependentNode]--;
          });
        })
      );
    }
  }

  // 単一ノード実行
  private async executeNode(nodeId: string): Promise<void> {
    const node = this.session.plan_spec.graph.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    console.log(`🔄 Executing node: ${nodeId} (${node.module})`);

    const nodeResult: NodeResult = {
      node_id: nodeId,
      module: node.module,
      status: 'failed',
      attempts: 0,
      inputs_ref: [],
      outputs_ref: [],
      logs: [],
      error: null,
      started_at: new Date()
    };

    // 開始イベント発行
    await this.emitEvent({
      event: 'NODE_STARTED',
      run_id: this.session.run_id,
      node_id: nodeId,
      title: node.title,
      ts: Date.now()
    });

    // リトライループ
    for (let attempt = 1; attempt <= this.environment.retry.max_retries + 1; attempt++) {
      nodeResult.attempts = attempt;

      try {
        // 入力準備
        const inputs = await this.prepareNodeInputs(node);
        nodeResult.inputs_ref = inputs.artifactIds;
        nodeResult.logs.push(`Attempt ${attempt}: Starting with inputs: ${inputs.artifactIds.join(', ')}`);

        // ツール実行
        console.log(`🔧 Executing tool: ${node.module} with params:`, { ...node.params, ...inputs.data });
        const toolResult = await this.executeWithTimeout(
          () => defaultToolRegistry.execute(node.module, { ...node.params, ...inputs.data }),
          this.environment.timeouts.node_ms
        );
        console.log(`📤 Tool result for ${node.module}:`, toolResult.success ? 'SUCCESS' : `FAILED: ${toolResult.error}`);

        if (!toolResult.success) {
          throw new Error(toolResult.error || 'Tool execution failed');
        }

        // 出力保存
        const outputs = await this.saveNodeOutputs(nodeId, node, toolResult.data);
        nodeResult.outputs_ref = outputs;
        nodeResult.logs.push(`Attempt ${attempt}: Completed with outputs: ${outputs.join(', ')}`);

        nodeResult.status = 'success';
        nodeResult.completed_at = new Date();
        nodeResult.duration_ms = Date.now() - nodeResult.started_at!.getTime();

        // 成功イベント発行
        await this.emitEvent({
          event: 'NODE_COMPLETED',
          run_id: this.session.run_id,
          node_id: nodeId,
          outputs: outputs,
          artifact_ids: outputs,
          ts: Date.now()
        });

        console.log(`✅ Node completed: ${nodeId} (attempt ${attempt})`);
        break;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        nodeResult.logs.push(`Attempt ${attempt}: Failed - ${errorMessage}`);
        
        console.warn(`⚠️ Node ${nodeId} attempt ${attempt} failed:`, errorMessage);

        // 最後の試行でない場合はバックオフ
        if (attempt < this.environment.retry.max_retries + 1) {
          const backoffMs = this.environment.retry.initial_backoff_ms * 
                           Math.pow(this.environment.retry.backoff_factor, attempt - 1);
          
          nodeResult.logs.push(`Attempt ${attempt}: Backing off for ${backoffMs}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          
          // フォールバック実行
          if (node.fallbacks && node.fallbacks.length > 0) {
            console.log(`🔄 Trying fallback for ${nodeId}: ${node.fallbacks[0]}`);
            // TODO: フォールバック実装
          }
        } else {
          // 全ての試行が失敗
          nodeResult.error = errorMessage;
          nodeResult.completed_at = new Date();
          
          await this.emitEvent({
            event: 'NODE_FAILED',
            run_id: this.session.run_id,
            node_id: nodeId,
            error: errorMessage,
            attempt,
            ts: Date.now()
          });

          console.error(`❌ Node failed after ${attempt} attempts: ${nodeId}`);
        }
      }
    }

    this.nodeResults[nodeId] = nodeResult;
  }

  // ノード入力準備
  private async prepareNodeInputs(node: PlanNode): Promise<{
    data: any;
    artifactIds: string[];
  }> {
    const data: any = {};
    const artifactIds: string[] = [];

    for (const input of node.inputs) {
      if (input.from === null) {
        // 初期入力
        continue;
      }

      const sourceArtifact = this.artifacts[input.from];
      if (!sourceArtifact) {
        throw new Error(`Missing input artifact from node: ${input.from}`);
      }

      const content = await ArtifactStorage.getArtifactContent(sourceArtifact);
      if (!content) {
        throw new Error(`Failed to load artifact: ${sourceArtifact}`);
      }

      artifactIds.push(sourceArtifact);

      // データ形式に応じて適切にパース
      try {
        data[input.contract] = JSON.parse(content);
      } catch {
        data[input.contract] = content;
      }
    }

    return { data, artifactIds };
  }

  // ノード出力保存
  private async saveNodeOutputs(nodeId: string, node: PlanNode, outputData: any): Promise<string[]> {
    const outputs: string[] = [];

    for (const output of node.outputs) {
      const content = output.artifact_type === 'json' 
        ? JSON.stringify(outputData, null, 2)
        : typeof outputData === 'string' 
        ? outputData 
        : JSON.stringify(outputData);

      const artifactId = await ArtifactStorage.createTextArtifact(
        content,
        output.artifact_type as any,
        {
          run_id: this.session.run_id,
          node_id: nodeId,
          contract: output.contract
        }
      );

      outputs.push(artifactId);
      this.artifacts[nodeId] = artifactId; // 最後の出力を保存
    }

    return outputs;
  }

  // タイムアウト付き実行
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn().then(resolve).catch(reject).finally(() => {
        clearTimeout(timer);
      });
    });
  }

  // トポロジカルソート
  private topologicalSort(nodes: PlanNode[], edges: any[]): string[] {
    const inDegree: Record<string, number> = {};
    const graph: Record<string, string[]> = {};

    // 初期化
    nodes.forEach(node => {
      inDegree[node.id] = 0;
      graph[node.id] = [];
    });

    // グラフ構築
    edges.forEach(edge => {
      graph[edge.from].push(edge.to);
      inDegree[edge.to]++;
    });

    // トポロジカルソート実行
    const queue = nodes.filter(node => inDegree[node.id] === 0).map(n => n.id);
    const result: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      graph[nodeId].forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (result.length !== nodes.length) {
      throw new Error('Cycle detected in DAG');
    }

    return result;
  }

  // その他のメソッドは文字数制限のため省略...
  // (validatePreconditions, createDeliverables, performAcceptanceCheck, etc.)

  private async validatePreconditions(): Promise<void> {
    // TODO: ポリシーチェック実装
  }

  private async createDeliverables(): Promise<Deliverable[]> {
    const deliverables: Deliverable[] = [];
    
    // 最終ノードの出力を成果物として設定
    const finalNodes = this.session.plan_spec.graph.nodes.filter(node => 
      node.module === 'synthesize_report'
    );
    
    for (const node of finalNodes) {
      const artifactId = this.artifacts[node.id];
      if (artifactId) {
        deliverables.push({
          type: 'report',
          format: 'md',
          artifact_id: artifactId,
          description: 'AI社員オーケストレーターによる調査レポート',
          created_at: new Date()
        });
        console.log('📄 Deliverable created:', { artifactId, type: 'report' });
      }
    }
    
    return deliverables;
  }

  private async performAcceptanceCheck(): Promise<AcceptanceCheck[]> {
    // TODO: 検収チェック実装
    return [];
  }

  private async generateProvenance(): Promise<Provenance[]> {
    // TODO: プロブナンス生成実装
    return [];
  }

  private generateSummary(acceptanceCheck: AcceptanceCheck[]): RunSummary {
    return {
      highlights: ['実行が完了しました'],
      caveats: [],
      next_actions: []
    };
  }

  private determineOverallStatus(acceptanceCheck: AcceptanceCheck[]): 'success' | 'partial' | 'failed' {
    return 'success';
  }

  private createFailureResult(error: any, executionTimeMs: number): RunnerResult {
    return {
      mode: 'run_result',
      run_id: this.session.run_id,
      status: 'failed',
      summary: {
        highlights: [],
        caveats: [`実行中にエラーが発生しました: ${error.message}`],
        next_actions: ['エラーログを確認してください']
      },
      deliverables: [],
      node_results: Object.values(this.nodeResults),
      acceptance_check: [],
      provenance: [],
      execution_time_ms: executionTimeMs,
      created_at: new Date()
    };
  }

  private async emitEvent(event: RunnerEvent): Promise<void> {
    this.events.push(event);
    console.log(`📡 Event: ${event.event} (${event.run_id})`);
    // TODO: リアルタイムイベント配信実装
  }

  private async saveSession(): Promise<void> {
    try {
      // Firestore保存（簡略版）
      const sessionData = {
        ...this.session,
        created_at: Timestamp.fromDate(this.session.created_at),
        updated_at: Timestamp.fromDate(this.session.updated_at),
        started_at: this.session.started_at ? Timestamp.fromDate(this.session.started_at) : null,
        completed_at: this.session.completed_at ? Timestamp.fromDate(this.session.completed_at) : null
      };

      await addDoc(collection(db, 'runner_sessions'), sessionData);
    } catch (error) {
      console.error('Save session error:', error);
    }
  }
}