import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/firebase-admin';
import { PLAN_SETTINGS } from '@/types/database';

// デバッグ用：現在のユーザーの課金情報をリセット（開発環境のみ）
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    // Development環境でのみ実行可能
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRef = db.collection('users').doc(userId);
    
    // 課金情報をリセット（デバッグ用の豊富な値を設定）
    const debugSettings = {
      summonContracts: 50,         // デバッグ用に多めに設定
      stamina: 500,               // デバッグ用に多めに設定  
      maxStamina: 500,
      lastStaminaRecovery: new Date(),
      subscription: 'free',
      subscriptionStatus: 'inactive'
    };

    await userRef.update(debugSettings);

    return NextResponse.json({
      message: 'Billing reset successfully for debugging',
      userId,
      newValues: debugSettings
    });
  } catch (error) {
    console.error('Error resetting billing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}