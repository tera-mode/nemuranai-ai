import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { generateCharacterResponse } from '@/lib/claude';
import { authOptions } from '@/lib/auth-options';
import { createThread, addMessageToThread, generateThreadTitle } from '@/lib/thread-actions';
import { consumeStamina } from '@/lib/billing-service';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// デバッグモード用の簡単なレスポンス生成
async function generateDebugResponse(message: string): Promise<{ content: string; images?: string[] }> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `以下のメッセージに対して、親切で役立つ回答をしてください：

${message}`
        }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return { content, images: [] };
  } catch (error) {
    console.error('Debug response generation error:', error);
    return { 
      content: `デバッグモードでの応答生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      images: [] 
    };
  }
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

    const { message, characterId, threadId, context } = await request.json();

    if (!message || !characterId) {
      return NextResponse.json(
        { error: 'Message and characterId are required' },
        { status: 400 }
      );
    }

    // デバッグモードの判定
    const isDebugMode = characterId === 'debug-test' || threadId === 'debug-thread';

    // ユーザーIDを安全に取得
    const userId = session.user.id || session.user.email || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      console.error('User ID not found in session:', session);
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    // デバッグモードでない場合のみスタミナ消費チェック
    const STAMINA_COST = 5;
    let staminaResult = { success: true, currentStamina: 999 }; // デバッグ用のダミー値
    
    if (!isDebugMode) {
      staminaResult = await consumeStamina(userId, STAMINA_COST);
      
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
    }

    // スレッドIDが指定されていない場合は新しいスレッドを作成（デバッグモード以外）
    let currentThreadId = threadId;
    if (!currentThreadId && !isDebugMode) {
      currentThreadId = await createThread(userId, characterId);
    } else if (!currentThreadId && isDebugMode) {
      currentThreadId = 'debug-thread'; // デバッグ用の固定ID
    }

    // ユーザーメッセージをスレッドに追加（デバッグモード以外）
    if (!isDebugMode) {
      await addMessageToThread(
        currentThreadId,
        characterId,
        userId,
        message,
        'user',
        false
      );
    }

    // レスポンス生成
    let response;
    if (isDebugMode) {
      // デバッグモード用の簡単なレスポンス生成
      response = await generateDebugResponse(message);
    } else {
      // 通常のClaude APIでレスポンス生成（マークダウン形式で）
      response = await generateCharacterResponse({
        message,
        characterId,
        userId,
        threadId: currentThreadId,
        context,
        useMarkdown: true, // マークダウン形式で生成
      });
    }

    // AIレスポンスをスレッドに追加（デバッグモード以外）
    if (!isDebugMode) {
      await addMessageToThread(
        currentThreadId,
        characterId,
        userId,
        response.content,
        'assistant',
        true, // マークダウン形式
        response.images // 画像配列
      );
    }

    // スレッドタイトルを自動生成（デバッグモード以外）
    const titleGenerated = !isDebugMode ? await generateThreadTitle(currentThreadId) : false;

    return NextResponse.json({
      response: response.content, // デバッグページで期待されているフィールド名
      message: response.content, // 後方互換性のため
      images: response.images,
      threadId: currentThreadId,
      titleGenerated, // タイトルが生成されたかどうか
      success: true,
      isDebugMode, // デバッグモードかどうか
      staminaConsumed: isDebugMode ? 0 : STAMINA_COST,
      remainingStamina: staminaResult.currentStamina,
      model: 'claude-sonnet-4-20250514' // モデル情報も追加
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}