import { NextRequest, NextResponse } from 'next/server';
import { getTempImage } from '@/lib/temp-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const imageData = getTempImage(imageId);
    
    if (!imageData) {
      return NextResponse.json(
        { error: '画像が見つからないか、期限切れです' },
        { status: 404 }
      );
    }
    
    // Base64をバイナリに変換
    const base64Data = imageData.base64;
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // 画像として返す
    return new NextResponse(binaryData, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': binaryData.length.toString(),
        'Cache-Control': 'public, max-age=86400', // 24時間キャッシュ
      },
    });
    
  } catch (error) {
    console.error('Temp image fetch error:', error);
    return NextResponse.json(
      { error: '画像の取得に失敗しました' },
      { status: 500 }
    );
  }
}