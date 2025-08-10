import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { Session } from 'next-auth';

// NextAuthセッションからFirebase認証を同期
export async function syncFirebaseAuth(session: Session | null) {
  if (!session?.user) {
    console.log('🔐 No NextAuth session, skipping Firebase sync');
    return null;
  }

  try {
    console.log('🔄 Syncing NextAuth with Firebase Auth...');
    
    // 既にFirebaseで認証済みかチェック
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === session.user.id) {
      console.log('✅ Firebase auth already synced');
      return currentUser;
    }

    console.log('🔑 NextAuth session found:', {
      userId: session.user.id,
      email: session.user.email,
      provider: session.user.image // Googleの場合はimage URLが存在
    });

    // Firebase カスタムトークンが必要な場合のプレースホルダー
    // 現在はGoogle OAuth を使用しているので、直接Firebase Authが同期されるはず
    
    // Google OAuth で Firebase Auth が自動的に同期されるまで待機
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkAuth = () => {
        attempts++;
        const user = auth.currentUser;
        
        if (user) {
          console.log('✅ Firebase auth synchronized:', user.uid);
          resolve(user);
        } else if (attempts >= maxAttempts) {
          console.error('❌ Firebase auth sync timeout');
          reject(new Error('Firebase auth sync failed'));
        } else {
          console.log(`🔄 Waiting for Firebase auth sync... (${attempts}/${maxAttempts})`);
          setTimeout(checkAuth, 500);
        }
      };
      
      checkAuth();
    });

  } catch (error) {
    console.error('❌ Firebase auth sync error:', error);
    throw error;
  }
}

// Firebase認証状態を強制的にリフレッシュ
export async function refreshFirebaseAuth() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    console.log('🔄 Refreshing Firebase auth token...');
    const token = await user.getIdToken(true); // forceRefresh = true
    console.log('✅ Firebase token refreshed');
    return token;
    
  } catch (error) {
    console.error('❌ Firebase token refresh failed:', error);
    throw error;
  }
}