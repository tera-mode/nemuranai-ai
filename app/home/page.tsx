'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUserCharacters } from '@/lib/character-actions';
import { getRecentThreads, getUserThreads } from '@/lib/thread-actions';
import { refreshFirestore } from '@/lib/firebase-client';
import { debugFirebaseAuth, debugNextAuthSession } from '@/lib/auth-debug';
import { useFirebaseAuthSync } from '@/lib/firebase-auth-sync';
import { testFirebaseAuthSync, checkFirebaseAuthState } from '@/lib/test-auth-sync';
import { AICharacter, ChatThread } from '@/types/database';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { CharacterCarousel } from '@/components/CharacterCarousel';
import BillingStatus from '@/components/BillingStatus';

function HomePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<AICharacter[]>([]);
  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Firebase Auth同期
  const { syncStatus, error: syncError, firebaseUser } = useFirebaseAuthSync();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = session?.user?.id || session?.user?.email;
      
      if (!userId) {
        console.error('User ID not found in session:', session);
        return;
      }
      
      console.log('Home: Loading data for user:', userId);
      console.log('Session details:', {
        sessionExists: !!session,
        sessionStatus: status,
        userId: session?.user?.id,
        email: session?.user?.email,
        name: session?.user?.name,
        provider: session?.provider
      });
      
      console.log('Firebase Auth sync status:', {
        syncStatus,
        syncError,
        firebaseUserExists: !!firebaseUser,
        firebaseUID: firebaseUser?.uid
      });
      
      // Firebase認証の詳細デバッグ
      console.log('🔍 Running Firebase auth debug...');
      await debugFirebaseAuth();
      debugNextAuthSession();
      
      // 認証同期テスト
      console.log('🧪 Testing Firebase Auth sync...');
      const syncSuccess = await testFirebaseAuthSync();
      console.log('Sync test result:', syncSuccess);
      
      // 同期後のFirebase Auth状態確認
      setTimeout(() => {
        checkFirebaseAuthState();
      }, 1000);
      
      const [userCharacters, recentThreadsForDisplay, allThreads] = await Promise.all([
        getUserCharacters(userId),
        getRecentThreads(userId, 5),
        getUserThreads(userId) // 全スレッドを取得してキャラクター順序に使用
      ]);
      
      // キャラクターを最新チャット順にソート
      const sortedCharacters = userCharacters.map(character => {
        // このキャラクターの全スレッドから最新のものを見つける
        const characterThreads = allThreads.filter(thread => thread.characterId === character.id);
        const latestThread = characterThreads.length > 0 
          ? characterThreads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
          : null;
        
        return {
          ...character,
          lastChatTime: latestThread ? latestThread.updatedAt : character.createdAt
        };
      }).sort((a, b) => b.lastChatTime.getTime() - a.lastChatTime.getTime());
      
      console.log('Home: Loaded characters:', sortedCharacters.map(c => ({ id: c.id, name: c.name, lastChatTime: c.lastChatTime })));
      
      setCharacters(sortedCharacters);
      setRecentThreads(recentThreadsForDisplay);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const handleCharacterSelect = (character: AICharacter) => {
    router.push(`/character/${character.id}/threads`);
  };

  const handleThreadSelect = (thread: ChatThread) => {
    router.push(`/character/${thread.characterId}/chat/${thread.id}`);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (session?.user?.id) {
      loadData();
    }
  }, [session, status, router, loadData]);

  // URLパラメータの変更を監視してデータを再読み込み
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true' && session?.user?.id && !isLoading) {
      console.log('Refresh parameter detected, refreshing Firestore and reloading data...');
      // Firestoreのネットワークをリフレッシュしてキャッシュを無効化
      refreshFirestore().then(() => {
        loadData();
      });
      // パラメータを削除してURL をクリーンに保つ
      router.replace('/home');
    }
  }, [searchParams, session, loadData, isLoading, router]);

  // ページが再フォーカスされた時にデータを再読み込み
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user?.id && !isLoading) {
        console.log('Page focused, reloading data...');
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session, loadData, isLoading]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* 背景画像 */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg001.jpg)' }}
      />
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      {/* ヘッダー */}
      <header className="relative z-50 flex justify-between items-center p-4">
        <div className="flex items-center">
          <img 
            src="/nemuranai-ai_logo.png" 
            alt="AI社員は眠らない ロゴ" 
            className="h-12 sm:h-14 md:h-16 lg:h-20 xl:h-24 w-auto max-w-[400px] drop-shadow-lg"
          />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <BillingStatus className="text-white" />
          <HamburgerMenu />
        </div>
      </header>

      {/* ウェルカムメッセージ */}
      <div className="relative z-40 px-4 -mt-2 mb-4">
        <div className="flex flex-col">
          <p className="text-white/90 text-xs sm:text-sm drop-shadow leading-tight">
            おかえりなさい
          </p>
          <p className="text-white font-medium text-sm sm:text-base drop-shadow leading-tight">
            {session.user?.name}さん
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="relative z-0 px-4 pb-8">
        {/* キャラクターカルーセル */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
            AI社員を選択
          </h2>
          <CharacterCarousel
            characters={characters}
            onCharacterSelect={handleCharacterSelect}
            onCreateCharacter={() => router.push('/create-character')}
          />
        </div>

        {/* 最近の会話 */}
        {recentThreads.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
              最近の会話
            </h2>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              {recentThreads.map((thread) => {
                const character = characters.find(c => c.id === thread.characterId);
                return (
                  <button
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread)}
                    className="w-full p-4 text-left border-b border-white/10 last:border-b-0 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {character?.profileImageUrl && (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20">
                          <img
                            src={character.profileImageUrl}
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">
                            {character?.name || 'Unknown'}
                          </span>
                          <span className="text-white/60 text-xs">
                            {thread.title}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs">
                          {thread.updatedAt.toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                      <div className="text-white/40">
                        →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* キャラクターがいない場合 */}
        {characters.length === 0 && (
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 mt-8">
            <div className="text-6xl mb-4">😴</div>
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              まだAI社員がいません
            </h3>
            <p className="text-white/90 mb-6 drop-shadow">
              最初のAI社員を作成してチャットを始めましょう
            </p>
            <button
              onClick={() => router.push('/create-character')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
            >
              最初のAI社員を作成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}