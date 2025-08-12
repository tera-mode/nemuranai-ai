import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { consumeStamina } from '@/lib/billing-service';
import { RunnerEngine } from '@/lib/runner-engine';
import { RunRequest, DEFAULT_RUNNER_ENVIRONMENT } from '@/lib/runner-types';

// UUID生成（既存パターンと同じ）
function generateUuid(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestData = await request.json();

    // リクエスト形式チェック
    if (requestData.mode !== 'run_request' || !requestData.job_spec || !requestData.plan_spec) {
      return NextResponse.json(
        { error: 'Invalid request format. mode=run_request, job_spec and plan_spec are required' },
        { status: 400 }
      );
    }

    // ユーザーIDを安全に取得
    const userId = session.user.id || session.user.email || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      console.error('User ID not found in session:', session);
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    // スタミナ消費チェック（実行は10スタミナ消費）
    const STAMINA_COST = 10;
    const staminaResult = await consumeStamina(userId, STAMINA_COST);
    
    if (!staminaResult.success) {
      return NextResponse.json(
        { 
          error: staminaResult.error === 'Insufficient stamina' 
            ? `スタミナが不足しています。必要: ${STAMINA_COST}, 現在: ${staminaResult.currentStamina}`
            : staminaResult.error,
          currentStamina: staminaResult.currentStamina,
          requiredStamina: STAMINA_COST
        },
        { status: 400 }
      );
    }

    // Run IDが指定されていない場合は生成
    const runId = requestData.run_id || generateUuid();

    console.log('🚀 Execution request:', {
      userId,
      runId,
      taskType: requestData.job_spec.task_type,
      nodeCount: requestData.plan_spec.graph.nodes.length
    });

    // RunRequest構築
    const runRequest: RunRequest = {
      mode: 'run_request',
      run_id: runId,
      job_spec: requestData.job_spec,
      plan_spec: requestData.plan_spec,
      skill_registry: requestData.skill_registry || [],
      env: requestData.env || DEFAULT_RUNNER_ENVIRONMENT
    };

    // 実行エンジン初期化
    console.log('🔧 Initializing runner engine...');
    const runner = new RunnerEngine(runRequest);

    // 非同期実行開始（バックグラウンド）
    console.log('⚡ Starting background execution...');
    
    // 即座にレスポンス返却（実行は非同期で継続）
    const initialResponse = {
      mode: 'run_started',
      run_id: runId,
      status: 'running',
      message: '実行を開始しました。',
      estimated_time_ms: estimateExecutionTime(requestData.plan_spec),
      success: true,
      staminaConsumed: STAMINA_COST,
      remainingStamina: staminaResult.currentStamina
    };

    // バックグラウンドで実際の実行
    setImmediate(async () => {
      try {
        console.log('🎬 Starting background runner execution');
        await runner.run('', userId); // threadIdは後で設定
        console.log('✅ Background execution completed');
      } catch (error) {
        console.error('❌ Background execution failed:', error);
      }
    });

    return NextResponse.json(initialResponse);

  } catch (error) {
    console.error('Run API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 実行時間見積もり
function estimateExecutionTime(planSpec: any): number {
  const nodes = planSpec.graph.nodes || [];
  const totalEstimatedTime = nodes.reduce((total: number, node: any) => {
    return total + (node.estimates?.latency_ms_p50 || 1000);
  }, 0);

  // 並列度を考慮
  const parallelism = planSpec.parallelism || 'safe';
  const parallelismFactor = parallelism === 'aggressive' ? 0.4 : parallelism === 'safe' ? 0.7 : 1.0;
  
  return Math.ceil(totalEstimatedTime * parallelismFactor);
}

// 実行状況取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json(
        { error: 'run_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Status request for run: ${runId}`);

    // TODO: 実際の実行状況を取得
    // 簡易実装：固定値を返す
    const mockStatus = {
      run_id: runId,
      status: 'running',
      current_node: 'n3',
      completed_nodes: ['n1', 'n2'],
      total_nodes: 5,
      progress_percent: 40,
      estimated_remaining_ms: 30000,
      events: [
        { event: 'RUN_STARTED', ts: Date.now() - 60000 },
        { event: 'NODE_COMPLETED', node_id: 'n1', ts: Date.now() - 45000 },
        { event: 'NODE_COMPLETED', node_id: 'n2', ts: Date.now() - 30000 },
        { event: 'NODE_STARTED', node_id: 'n3', ts: Date.now() - 15000 }
      ]
    };

    return NextResponse.json(mockStatus);

  } catch (error) {
    console.error('Run Status API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}