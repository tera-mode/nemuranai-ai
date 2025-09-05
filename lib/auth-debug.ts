import { auth, db } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Firebase認証の詳細デバッグ情報を取得
export async function debugFirebaseAuth(): Promise<void> {
  console.log('🔍 === Firebase Auth Debug Started ===');
  
  // 現在の認証状態を確認
  const currentUser = auth.currentUser;
  console.log('Current User:', {
    uid: currentUser?.uid,
    email: currentUser?.email,
    emailVerified: currentUser?.emailVerified,
    isAnonymous: currentUser?.isAnonymous,
    providerData: currentUser?.providerData,
    accessToken: currentUser ? 'exists' : 'null',
    refreshToken: currentUser ? 'exists' : 'null'
  });

  if (currentUser) {
    try {
      // IDトークンを取得してみる
      const idToken = await currentUser.getIdToken();
      console.log('✅ ID Token acquired, length:', idToken.length);
      
      // IDトークンの詳細を取得
      const tokenResult = await currentUser.getIdTokenResult();
      console.log('Token claims:', {
        issuer: tokenResult.issuer,
        audience: tokenResult.audience,
        authTime: new Date(tokenResult.authTime).toISOString(),
        issuedAtTime: new Date(tokenResult.issuedAtTime).toISOString(),
        expirationTime: new Date(tokenResult.expirationTime).toISOString(),
        signInProvider: tokenResult.signInProvider,
        claims: Object.keys(tokenResult.claims)
      });

      // 簡単なFirestoreテストクエリ
      console.log('🔍 Testing Firestore access...');
      const testDocRef = doc(db, 'users', currentUser.uid);
      const testDoc = await getDoc(testDocRef);
      console.log('✅ Firestore test query successful, doc exists:', testDoc.exists());
      
    } catch (error: any) {
      console.error('❌ Firebase Auth/Firestore test failed:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  } else {
    console.log('❌ No authenticated user found');
  }

  // 認証状態変更リスナーを設定
  console.log('🔍 Setting up auth state listener...');
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log('🔄 Auth state changed:', {
      timestamp: new Date().toISOString(),
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified
    });
  });

  // 5秒後にリスナーを解除
  setTimeout(() => {
    unsubscribe();
    console.log('🔍 === Firebase Auth Debug Completed ===');
  }, 5000);
}

// NextAuthとFirebaseの同期状態をデバッグ
export function debugNextAuthSession(): void {
  console.log('🔍 === NextAuth Session Debug ===');
  
  // NextAuthセッションをチェック
  if (typeof window !== 'undefined') {
    // ブラウザ環境でのセッション情報
    const sessionData = document.cookie
      .split('; ')
      .find(row => row.startsWith('next-auth.session-token'));
    
    console.log('NextAuth session cookie exists:', !!sessionData);
    
    // LocalStorageの認証情報をチェック
    const keys = Object.keys(localStorage);
    const authKeys = keys.filter(key => 
      key.includes('auth') || 
      key.includes('firebase') || 
      key.includes('token')
    );
    
    console.log('LocalStorage auth-related keys:', authKeys);
    
    // SessionStorageの認証情報をチェック
    const sessionKeys = Object.keys(sessionStorage);
    const sessionAuthKeys = sessionKeys.filter(key => 
      key.includes('auth') || 
      key.includes('firebase') || 
      key.includes('token')
    );
    
    console.log('SessionStorage auth-related keys:', sessionAuthKeys);
  }
}