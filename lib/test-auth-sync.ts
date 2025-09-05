import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

// 認証同期をテストする関数
export async function testFirebaseAuthSync(): Promise<boolean> {
  try {
    console.log('🧪 Testing Firebase Auth sync...');
    
    // カスタムトークンAPIを呼び出し
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NextAuth セッションクッキーを自動的に送信
      },
      credentials: 'include' // クッキーを含める
    });

    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      
      if (errorData.fallback) {
        console.log('⚠️ Firebase Admin SDK not available, sync skipped');
        return false;
      }
      
      throw new Error(errorData.error || 'Token generation failed');
    }

    const data = await response.json();
    console.log('✅ Custom token received for user:', data.uid);
    
    // カスタムトークンでFirebase Authにサインイン
    const userCredential = await signInWithCustomToken(auth, data.customToken);
    console.log('✅ Firebase Auth sync successful:', userCredential.user.uid);
    
    // Firebase Auth状態を確認
    console.log('Current Firebase user:', {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    });
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Firebase Auth sync test failed:', error);
    return false;
  }
}

// Firebase Auth状態をチェック
export function checkFirebaseAuthState() {
  const user = auth.currentUser;
  console.log('🔍 Firebase Auth state check:', {
    isAuthenticated: !!user,
    uid: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified
  });
  return !!user;
}