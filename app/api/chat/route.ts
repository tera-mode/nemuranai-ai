import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { generateCharacterResponse } from '@/lib/claude';
import { authOptions } from '../auth/[...nextauth]/route';
import { createThread, addMessageToThread, generateThreadTitle } from '@/lib/thread-actions';

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
      context,
      useMarkdown: true, // マークダウン形式で生成
    });

    // AIレスポンスをスレッドに追加
    await addMessageToThread(
      currentThreadId,
      characterId,
      userId,
      response,
      'assistant',
      true // マークダウン形式
    );

    // スレッドタイトルを自動生成
    const titleGenerated = await generateThreadTitle(currentThreadId);

    return NextResponse.json({
      message: response,
      threadId: currentThreadId,
      titleGenerated, // タイトルが生成されたかどうか
      success: true,
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}