import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createSubscriptionCheckout, createOneTimeCheckout } from '@/lib/stripe-service';
import { getUserBillingInfo } from '@/lib/billing-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productType } = await request.json();

    if (!productType) {
      return NextResponse.json({ error: 'Product type is required' }, { status: 400 });
    }

    const validProductTypes = ['premium_plan', 'summon_contracts', 'stamina_recovery'];
    if (!validProductTypes.includes(productType)) {
      return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
    }

    let checkoutUrl: string;

    if (productType === 'premium_plan') {
      // サブスクリプション
      checkoutUrl = await createSubscriptionCheckout(
        session.user.id,
        session.user.email,
        session.user.name || undefined
      );
    } else {
      // 従量課金
      checkoutUrl = await createOneTimeCheckout(
        session.user.id,
        session.user.email,
        productType as 'summon_contracts' | 'stamina_recovery',
        session.user.name || undefined
      );
    }

    return NextResponse.json({ 
      checkoutUrl,
      productType 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}