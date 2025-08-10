import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminUser } from '@/lib/debug-auth';
import { isAdminSDKAvailable } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 環境情報
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      platform: process.platform || 'unknown',
      version: process.version || 'unknown',
      timestamp: new Date().toISOString()
    };

    // API キー存在チェック
    const apis = {
      stability: !!process.env.STABILITY_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      firebase: !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      nextauth: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL)
    };

    // サービス状態チェック（実際の初期化状態を確認）
    const services = {
      firebaseAdmin: isAdminSDKAvailable(),
      firebaseClient: !!(
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      ),
      storage: !!process.env.FIREBASE_STORAGE_BUCKET || !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      auth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    };

    // 環境変数存在チェック（値は秘匿）
    const envVars = [
      'NODE_ENV',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'STABILITY_API_KEY',
      'ANTHROPIC_API_KEY',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'NEXT_PUBLIC_APP_NAME',
      'NEXT_PUBLIC_APP_DOMAIN'
    ];

    const env: { [key: string]: boolean } = {};
    envVars.forEach(varName => {
      env[varName] = !!process.env[varName];
    });

    return NextResponse.json({
      success: true,
      environment,
      apis,
      services,
      env,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch system information',
        environment: { nodeEnv: 'unknown', platform: 'unknown', version: 'unknown', timestamp: new Date().toISOString() },
        apis: { stability: false, anthropic: false, firebase: false, nextauth: false },
        services: { firebaseAdmin: false, firebaseClient: false, storage: false, auth: false },
        env: {}
      },
      { status: 500 }
    );
  }
}