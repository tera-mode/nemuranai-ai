import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { consumeStamina } from '@/lib/billing-service';
import { PlannerManager } from '@/lib/planner';
import { PlanRequest, DEFAULT_SKILL_REGISTRY } from '@/lib/plan-spec-types';

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

    const requestData: PlanRequest = await request.json();

    if (!requestData.job_spec || requestData.mode !== 'plan_request') {
      return NextResponse.json(
        { error: 'Invalid request format. job_spec and mode=plan_request are required' },
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

    // スタミナ消費チェック（計画作成は2スタミナ消費）
    const STAMINA_COST = 2;
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

    console.log('🎯 Plan generation request:', {
      userId,
      taskType: requestData.job_spec.task_type,
      taskId: requestData.job_spec.task_id
    });

    // スキルレジストリを使用（リクエストに含まれていない場合はデフォルトを使用）
    const skillRegistry = requestData.skill_registry || DEFAULT_SKILL_REGISTRY;

    // PlanSpec生成
    console.log('📋 Generating plan spec...');
    const planSpec = PlannerManager.generatePlanSpec(requestData.job_spec, skillRegistry);
    console.log('✅ Plan spec generated successfully');

    // 人間向けサマリー生成
    const summaryText = generateHumanReadableSummary(planSpec);

    // レスポンス構築
    const response = {
      mode: 'plan' as const,
      plan_spec: planSpec,
      summary_text: summaryText,
      success: true,
      staminaConsumed: STAMINA_COST,
      remainingStamina: staminaResult.currentStamina
    };

    console.log('🚀 Plan generation completed:', {
      taskId: planSpec.task_id,
      nodeCount: planSpec.graph.nodes.length,
      parallelism: planSpec.parallelism
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Plan API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 人間向けサマリー生成
function generateHumanReadableSummary(planSpec: any): string {
  const nodeCount = planSpec.graph.nodes.length;
  const parallelism = planSpec.parallelism;
  const estimatedTime = calculateEstimatedTime(planSpec.graph.nodes);
  
  let summary = `## 📋 実行計画プレビュー\n\n`;
  summary += `**概要**: ${planSpec.summary}\n\n`;
  summary += `**処理ステップ**: ${nodeCount}段階\n`;
  summary += `**並列度**: ${parallelism === 'safe' ? '安全' : parallelism === 'aggressive' ? '積極的' : 'なし'}\n`;
  summary += `**予想時間**: 約${Math.ceil(estimatedTime / 1000)}秒\n\n`;
  
  summary += `### 🔄 処理フロー\n`;
  planSpec.graph.nodes.forEach((node: any, index: number) => {
    summary += `${index + 1}. **${node.title}** (${node.estimates.cost_hint}コスト)\n`;
    summary += `   └ ${node.purpose}\n`;
  });
  
  summary += `\n### ✅ 検収条件\n`;
  planSpec.coverage_to_acceptance.forEach((coverage: any) => {
    const status = coverage.gaps.length === 0 ? '✅' : '⚠️';
    summary += `${status} ${coverage.criterion}\n`;
  });
  
  if (planSpec.assumptions.length > 0) {
    summary += `\n### 💡 前提条件\n`;
    planSpec.assumptions.forEach((assumption: string) => {
      summary += `- ${assumption}\n`;
    });
  }
  
  if (planSpec.open_issues.length > 0) {
    summary += `\n### ⚠️ 要確認事項\n`;
    planSpec.open_issues.forEach((issue: string) => {
      summary += `- ${issue}\n`;
    });
  }
  
  summary += `\n**この計画で実行を開始しますか？**`;
  
  return summary;
}

// 予想実行時間計算
function calculateEstimatedTime(nodes: any[]): number {
  return nodes.reduce((total, node) => {
    return total + (node.estimates.latency_ms_p50 || 1000);
  }, 0);
}