import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { initializeUserBilling, getUserBillingInfo } from '@/lib/billing-service';

// 現在のユーザーの課金情報を初期化
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 既に課金情報が存在するかチェック
    const existingUser = await getUserBillingInfo(session.user.id);
    
    if (existingUser && typeof existingUser.stamina === 'number') {
      return NextResponse.json({
        message: 'User billing already initialized',
        user: {
          stamina: existingUser.stamina,
          maxStamina: existingUser.maxStamina,
          summonContracts: existingUser.summonContracts,
          subscription: existingUser.subscription
        }
      });
    }

    // 課金情報を初期化
    const initializedUser = await initializeUserBilling(
      session.user.id,
      session.user.email,
      session.user.name || session.user.email.split('@')[0]
    );

    return NextResponse.json({
      message: 'User billing initialized successfully',
      user: {
        stamina: initializedUser.stamina,
        maxStamina: initializedUser.maxStamina,
        summonContracts: initializedUser.summonContracts,
        subscription: initializedUser.subscription
      }
    });
  } catch (error) {
    console.error('Error initializing user billing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 現在のユーザーの課金情報取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userBilling = await getUserBillingInfo(session.user.id);
    
    if (!userBilling) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userBilling.id,
        email: userBilling.email,
        displayName: userBilling.displayName,
        subscription: userBilling.subscription,
        subscriptionStatus: userBilling.subscriptionStatus,
        stamina: userBilling.stamina,
        maxStamina: userBilling.maxStamina,
        summonContracts: userBilling.summonContracts,
        lastStaminaRecovery: userBilling.lastStaminaRecovery,
        isAdmin: userBilling.isAdmin || false
      }
    });
  } catch (error) {
    console.error('Error fetching user billing info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}