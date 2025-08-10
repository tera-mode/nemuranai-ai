import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { generateCharacterResponse } from '@/lib/claude';
import { authOptions } from '@/lib/auth-options';
import { createThread, addMessageToThread, generateThreadTitle } from '@/lib/thread-actions';
import { consumeStamina } from '@/lib/billing-service';

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

    // ユーザーIDを安全に取得
    const userId = session.user.id || session.user.email || 'anonymous';
    
    if (!userId || userId === 'anonymous') {
      console.error('User ID not found in session:', session);
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    // スタミナ消費チェック（チャットは5スタミナ消費）
    const STAMINA_COST = 5;
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

    // スレッドIDが指定されていない場合は新しいスレッドを作成
    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = await createThread(userId, characterId);
    }

    // ユーザーメッセージをスレッドに追加
    await addMessageToThread(
      currentThreadId,
      characterId,
      userId,
      message,
      'user',
      false
    );

    // Claude APIでレスポンス生成（マークダウン形式で）
    const response = await generateCharacterResponse({
      message,
      characterId,
      userId,
      threadId: currentThreadId,
      context,
      useMarkdown: true, // マークダウン形式で生成
    });

    // AIレスポンスをスレッドに追加
    await addMessageToThread(
      currentThreadId,
      characterId,
      userId,
      response.content,
      'assistant',
      true, // マークダウン形式
      response.images // 画像配列
    );

    // スレッドタイトルを自動生成
    const titleGenerated = await generateThreadTitle(currentThreadId);

    return NextResponse.json({
      message: response.content,
      images: response.images,
      threadId: currentThreadId,
      titleGenerated, // タイトルが生成されたかどうか
      success: true,
      staminaConsumed: STAMINA_COST,
      remainingStamina: staminaResult.currentStamina
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}