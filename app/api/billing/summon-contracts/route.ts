import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { consumeSummonContract, getUserBillingInfo } from '@/lib/billing-service';

// 召喚契約書情報取得
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
      summonContracts: userBilling.summonContracts
    });
  } catch (error) {
    console.error('Error fetching summon contracts info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 召喚契約書消費
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount = 1 } = await request.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const result = await consumeSummonContract(session.user.id, amount);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        currentContracts: result.currentContracts 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      currentContracts: result.currentContracts
    });
  } catch (error) {
    console.error('Error consuming summon contract:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}