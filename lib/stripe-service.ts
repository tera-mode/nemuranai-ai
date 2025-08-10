import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
import { PRODUCT_PRICES } from '@/types/database';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export { stripe };

// Stripe顧客を作成または取得
export async function createOrGetStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    // 既存の顧客IDをチェック
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.stripeCustomerId) {
      // 既存の顧客IDが有効かチェック
      try {
        await stripe.customers.retrieve(userData.stripeCustomerId);
        return userData.stripeCustomerId;
      } catch (error) {
        console.warn('Existing Stripe customer ID is invalid, creating new one');
      }
    }

    // 新しいStripe顧客を作成
    const customer = await stripe.customers.create({
      email,
      name: name || email.split('@')[0],
      metadata: {
        userId,
      },
    });

    // Firebase上の顧客IDを更新
    await db.collection('users').doc(userId).update({
      stripeCustomerId: customer.id,
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating/getting Stripe customer:', error);
    throw error;
  }
}

// サブスクリプション用のCheckoutセッションを作成
export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    const customerId = await createOrGetStripeCustomer(userId, email, name);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'プレミアムプラン',
              description: 'AI社員は眠らない - プレミアムプラン（月額）',
            },
            unit_amount: PRODUCT_PRICES.premium_plan,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard`,
      metadata: {
        userId,
        productType: 'premium_plan',
      },
      subscription_data: {
        metadata: {
          userId,
          productType: 'premium_plan',
        },
      },
    });

    return session.url!;
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    throw error;
  }
}

// 従量課金用のCheckoutセッションを作成
export async function createOneTimeCheckout(
  userId: string,
  email: string,
  productType: 'summon_contracts' | 'stamina_recovery',
  name?: string
): Promise<string> {
  try {
    const customerId = await createOrGetStripeCustomer(userId, email, name);

    let productName: string;
    let productDescription: string;
    let unitAmount: number;
    let quantity: number;

    switch (productType) {
      case 'summon_contracts':
        productName = '召喚契約書 10枚セット';
        productDescription = 'AI社員を召喚するための契約書';
        unitAmount = PRODUCT_PRICES.summon_contracts_10;
        quantity = 10;
        break;
      case 'stamina_recovery':
        productName = 'スタミナ回復 100ポイント';
        productDescription = 'AI機能を使用するためのスタミナ';
        unitAmount = PRODUCT_PRICES.stamina_recovery_100;
        quantity = 100;
        break;
      default:
        throw new Error('Invalid product type');
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard`,
      metadata: {
        userId,
        productType,
        quantity: quantity.toString(),
      },
    });

    return session.url!;
  } catch (error) {
    console.error('Error creating one-time checkout:', error);
    throw error;
  }
}

// Checkoutセッションを取得
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent'],
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    throw error;
  }
}

// サブスクリプションを取得
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

// サブスクリプションをキャンセル
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// 顧客ポータルのセッションを作成
export async function createCustomerPortalSession(
  customerId: string
): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}