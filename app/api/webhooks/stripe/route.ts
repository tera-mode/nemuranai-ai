import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe-service';
import { db } from '@/lib/firebase-admin';
import { PLAN_SETTINGS } from '@/types/database';
import { recordTransaction } from '@/lib/billing-service';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const productType = session.metadata?.productType;
  
  if (!userId || !productType) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  console.log(`Processing checkout completion for user ${userId}, product: ${productType}`);

  try {
    if (productType === 'premium_plan') {
      // サブスクリプション開始の処理は subscription.created で行う
      console.log('Premium plan checkout completed, waiting for subscription event');
    } else {
      // 従量課金の処理
      await processOneTimePurchase(userId, productType, session);
    }

    // 取引履歴を記録
    await recordTransaction({
      userId,
      type: productType === 'premium_plan' ? 'subscription' : 'one_time_purchase',
      productType: productType as any,
      amount: session.amount_total! / 100, // Stripeは cents単位
      quantity: productType === 'summon_contracts' ? 10 : 100,
      stripePaymentIntentId: session.payment_intent as string,
      status: 'completed',
      completedAt: new Date()
    });
  } catch (error) {
    console.error('Error processing checkout completion:', error);
  }
}

async function processOneTimePurchase(userId: string, productType: string, session: Stripe.Checkout.Session) {
  const userRef = db.collection('users').doc(userId);
  
  await db.runTransaction(async (transaction: any) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const updates: any = {};

    if (productType === 'summon_contracts') {
      // 召喚契約書 10枚を追加
      updates.summonContracts = (userData.summonContracts || 0) + 10;
      console.log(`Adding 10 summon contracts to user ${userId}`);
    } else if (productType === 'stamina_recovery') {
      // スタミナ 100ポイントを追加（最大値制限あり）
      const currentStamina = userData.stamina || 0;
      const maxStamina = userData.maxStamina || PLAN_SETTINGS.free.maxStamina;
      updates.stamina = Math.min(currentStamina + 100, maxStamina);
      console.log(`Adding stamina to user ${userId}: ${currentStamina} -> ${updates.stamina}`);
    }

    transaction.update(userRef, updates);
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  console.log(`Processing subscription update for user ${userId}`);

  try {
    const userRef = db.collection('users').doc(userId);
    const updates: any = {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionStartDate: new Date(subscription.created * 1000),
      subscription: 'premium'
    };

    if (subscription.current_period_end) {
      updates.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    }

    // プレミアムプランの特典を適用
    if (subscription.status === 'active') {
      const premiumSettings = PLAN_SETTINGS.premium;
      
      await db.runTransaction(async (transaction: any) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const isNewSubscription = !userData.subscriptionId || userData.subscription !== 'premium';

        if (isNewSubscription) {
          // 新規サブスクリプション：初回ボーナスを付与
          updates.summonContracts = (userData.summonContracts || 0) + premiumSettings.initialSummonContracts - PLAN_SETTINGS.free.initialSummonContracts;
          updates.stamina = Math.min(
            (userData.stamina || 0) + premiumSettings.initialStamina - PLAN_SETTINGS.free.initialStamina,
            premiumSettings.maxStamina
          );
          updates.maxStamina = premiumSettings.maxStamina;
          console.log(`New premium subscription for user ${userId}, applying initial bonuses`);
        } else {
          // 既存サブスクリプション：月額ボーナスかもしれない
          updates.maxStamina = premiumSettings.maxStamina;
        }

        transaction.update(userRef, updates);
      });
    } else {
      // サブスクリプションが非アクティブの場合は無料プランに戻す
      updates.subscription = 'free';
      updates.maxStamina = PLAN_SETTINGS.free.maxStamina;
      await userRef.update(updates);
    }
  } catch (error) {
    console.error('Error processing subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  console.log(`Processing subscription deletion for user ${userId}`);

  try {
    const freeSettings = PLAN_SETTINGS.free;
    await db.collection('users').doc(userId).update({
      subscription: 'free',
      subscriptionStatus: 'canceled',
      maxStamina: freeSettings.maxStamina,
      subscriptionEndDate: new Date(subscription.ended_at! * 1000)
    });
  } catch (error) {
    console.error('Error processing subscription deletion:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // 月次課金成功時の処理（月額ボーナス付与など）
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  console.log(`Processing monthly payment success for user ${userId}`);

  try {
    const userRef = db.collection('users').doc(userId);
    const premiumSettings = PLAN_SETTINGS.premium;

    await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      
      // 月額ボーナスを付与
      const updates = {
        summonContracts: (userData.summonContracts || 0) + premiumSettings.monthlyBonusSummonContracts,
        stamina: Math.min(
          (userData.stamina || 0) + premiumSettings.monthlyBonusStamina,
          premiumSettings.maxStamina
        )
      };

      transaction.update(userRef, updates);
      console.log(`Applied monthly bonuses to user ${userId}`);
    });
  } catch (error) {
    console.error('Error processing monthly payment success:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // 支払い失敗時の処理
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  console.log(`Processing payment failure for user ${userId}`);

  try {
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'past_due'
    });
  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
}