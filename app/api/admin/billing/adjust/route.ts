import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { adjustStamina, adjustSummonContracts, getUserBillingInfo } from '@/lib/billing-service';

// Admin権限でスタミナ・召喚契約書を調整
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin権限チェック
    const adminUser = await getUserBillingInfo(session.user.id);
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { targetUserId, type, amount, reason } = await request.json();
    
    if (!targetUserId || !type || !amount || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['stamina', 'summon_contracts'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let result;
    if (type === 'stamina') {
      result = await adjustStamina(session.user.id, targetUserId, amount, reason);
    } else {
      result = await adjustSummonContracts(session.user.id, targetUserId, amount, reason);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newValue: type === 'stamina' ? result.newStamina : result.newContracts,
      type
    });
  } catch (error) {
    console.error('Error adjusting billing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin用：ユーザーの課金情報取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin権限チェック
    const adminUser = await getUserBillingInfo(session.user.id);
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const userBilling = await getUserBillingInfo(targetUserId);
    if (!userBilling) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: userBilling.id,
      email: userBilling.email,
      displayName: userBilling.displayName,
      subscription: userBilling.subscription,
      subscriptionStatus: userBilling.subscriptionStatus,
      stamina: userBilling.stamina,
      maxStamina: userBilling.maxStamina,
      summonContracts: userBilling.summonContracts,
      lastStaminaRecovery: userBilling.lastStaminaRecovery,
      createdAt: userBilling.createdAt,
      lastLogin: userBilling.lastLogin
    });
  } catch (error) {
    console.error('Error fetching user billing info for admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}