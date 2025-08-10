import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { consumeStamina, getUserBillingInfo } from '@/lib/billing-service';

// スタミナ情報取得
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
      stamina: userBilling.stamina,
      maxStamina: userBilling.maxStamina,
      lastStaminaRecovery: userBilling.lastStaminaRecovery
    });
  } catch (error) {
    console.error('Error fetching stamina info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// スタミナ消費
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const result = await consumeStamina(session.user.id, amount);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        currentStamina: result.currentStamina 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      currentStamina: result.currentStamina
    });
  } catch (error) {
    console.error('Error consuming stamina:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}