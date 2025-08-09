import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getTempImage } from '@/lib/temp-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
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

    const { imageId } = await params;
    
    // 画像を取得
    const imageData = getTempImage(imageId);
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image not found or expired' },
        { status: 404 }
      );
    }

    // アクセス権限をチェック（作成したユーザーのみアクセス可能）
    const userId = session.user.id || session.user.email;
    if (imageData.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Base64データをバイナリに変換
    const imageBuffer = Buffer.from(imageData.base64, 'base64');

    // 適切なContent-Typeヘッダーで画像を返す
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
      },
    });

  } catch (error) {
    console.error('Temp image API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}