import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

// NextAuthセッションをFirebase Authに同期する
export function useFirebaseAuthSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return; // セッション読み込み中は待機

    const syncAuth = async () => {
      if (session?.user) {
        try {
          console.log('🔄 Syncing NextAuth session to Firebase Auth...');
          
          // 既にFirebase Authで認証済みかチェック
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === session.user.id) {
            console.log('✅ Already synced with Firebase Auth');
            return;
          }

          // カスタムトークンAPIエンドポイントを作成する必要があります
          // 現在はログのみで実装をスキップ
          console.log('⚠️ Firebase Auth sync not yet implemented');
          console.log('NextAuth user:', {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
          });

        } catch (error) {
          console.error('❌ Firebase Auth sync failed:', error);
        }
      } else {
        // セッションがない場合はFirebase Authからサインアウト
        if (auth.currentUser) {
          console.log('🔄 Signing out from Firebase Auth...');
          await auth.signOut();
        }
      }
    };

    syncAuth();
  }, [session, status]);

  return {
    isAuthenticated: !!session,
    firebaseUser: auth.currentUser,
    nextAuthUser: session?.user
  };
}