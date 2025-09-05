import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

// NextAuthセッションからFirebaseカスタムトークンを生成
export async function POST(request: NextRequest) {
  try {
    // NextAuthセッションを取得（requestオブジェクトも渡す）
    const session = await getServerSession(authOptions);
    
    console.log('API Debug - Session check:', {
      sessionExists: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
      // Firebase Admin SDKでカスタムトークンを生成
      const admin = await import('firebase-admin/auth');
      const { getApps, initializeApp, cert } = await import('firebase-admin/app');
      
      // Admin アプリの初期化確認
      let app;
      if (getApps().length === 0) {
        // 環境変数から設定を読み込んで初期化
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!projectId || !clientEmail || !privateKey) {
          console.log('Firebase Admin SDK environment variables not available');
          return NextResponse.json({ 
            error: 'Firebase Admin not configured',
            fallback: true 
          }, { status: 503 });
        }
        
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          })
        });
      } else {
        app = getApps()[0];
      }
      
      const auth = admin.getAuth(app);
      
      const customClaims = {
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        nextauth: true
      };

      const customToken = await auth.createCustomToken(session.user.id, customClaims);
      
      console.log('✅ Firebase custom token generated for user:', session.user.id);
      
      return NextResponse.json({ 
        customToken,
        uid: session.user.id 
      });

    } catch (adminError: any) {
      console.error('Firebase Admin SDK error:', adminError);
      
      return NextResponse.json({ 
        error: 'Admin SDK error',
        message: adminError.message,
        fallback: true
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Firebase token generation error:', error);
    
    return NextResponse.json({ 
      error: 'Token generation failed',
      message: error.message 
    }, { status: 500 });
  }
}