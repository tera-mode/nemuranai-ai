import { NextRequest, NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/temp-storage';

export async function GET(request: NextRequest) {
  try {
    const stats = getStorageStats();
    
    return NextResponse.json({
      success: true,
      stats,
      message: `現在 ${stats.totalImages} 個の一時画像が保存されています`
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'デバッグ情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}