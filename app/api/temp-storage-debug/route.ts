import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminUser } from '@/lib/debug-auth';
import { getStorageStats, clearTempStorage } from '@/lib/temp-storage';

export async function GET(request: NextRequest) {
  try {
    const stats = getStorageStats();
    
    return NextResponse.json({
      success: true,
      ...stats,
      debug: {
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        uptime: process.uptime()
      }
    });
    
  } catch (error) {
    console.error('Temp storage debug error:', error);
    return NextResponse.json(
      { error: 'Failed to get storage stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clearedCount = clearTempStorage();
    
    return NextResponse.json({
      success: true,
      message: `一時ストレージをクリアしました（${clearedCount}件の画像を削除）`,
      clearedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Temp storage clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear temp storage' },
      { status: 500 }
    );
  }
}