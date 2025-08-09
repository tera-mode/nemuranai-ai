import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { ConversationalDesignManager } from '@/lib/conversational-design';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { threadId } = await params;
    
    // セッションを取得
    const designSession = await ConversationalDesignManager.getSessionByThread(threadId);
    
    if (!designSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // セッション情報を返す（機密情報は除く）
    return NextResponse.json({
      id: designSession.id,
      status: designSession.status,
      useCase: designSession.useCase,
      generatedImages: designSession.generatedImages,
      updatedAt: designSession.updatedAt,
      success: true
    });

  } catch (error) {
    console.error('Design session API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}