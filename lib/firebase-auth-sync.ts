import { auth } from '@/lib/firebase-client';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// NextAuthセッションをFirebase Authに同期
export function useFirebaseAuthSync() {
  const { data: session, status } = useSession();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    const syncFirebaseAuth = async () => {
      if (session?.user) {
        try {
          setSyncStatus('syncing');
          
          // 既にFirebaseで認証済みかチェック
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === session.user.id) {
            console.log('✅ Already synced with Firebase Auth');
            setSyncStatus('synced');
            return;
          }

          console.log('🔄 Syncing NextAuth session to Firebase Auth...');
          
          // カスタムトークンAPIを呼び出し
          const response = await fetch('/api/auth/firebase-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          
          if (!response.ok) {
            if (data.fallback) {
              // Admin SDKが利用できない場合はスキップ
              console.log('⚠️ Firebase Admin SDK not available, skipping sync');
              setSyncStatus('idle');
              return;
            }
            throw new Error(data.error || 'Token generation failed');
          }

          // カスタムトークンでFirebase Authにサインイン
          await signInWithCustomToken(auth, data.customToken);
          
          console.log('✅ Firebase Auth sync successful');
          setSyncStatus('synced');
          setError(null);

        } catch (error: any) {
          console.error('❌ Firebase Auth sync failed:', error);
          setSyncStatus('failed');
          setError(error.message);
        }
      } else {
        // セッションがない場合はFirebase Authからサインアウト
        if (auth.currentUser) {
          console.log('🔄 Signing out from Firebase Auth...');
          await signOut(auth);
        }
        setSyncStatus('idle');
      }
    };

    syncFirebaseAuth();
  }, [session, status]);

  return {
    syncStatus,
    error,
    isAuthenticated: !!session,
    firebaseUser: auth.currentUser,
    nextAuthUser: session?.user
  };
}

// 手動同期関数
export async function syncFirebaseAuthManually(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/firebase-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const data = await response.json();
      if (data.fallback) {
        console.log('⚠️ Firebase Admin SDK not available, skipping manual sync');
        return false;
      }
      throw new Error(data.error || 'Token generation failed');
    }

    const data = await response.json();
    await signInWithCustomToken(auth, data.customToken);
    
    console.log('✅ Manual Firebase Auth sync successful');
    return true;
    
  } catch (error: any) {
    console.error('❌ Manual Firebase Auth sync failed:', error);
    return false;
  }
}