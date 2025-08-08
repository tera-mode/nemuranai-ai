'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CharacterCard } from '@/components/CharacterCard';
import { ChatInterface } from '@/components/ChatInterface';
import { ThreadList } from '@/components/ThreadList';
import { getUserCharacters } from '@/lib/character-actions';
import { createThread } from '@/lib/thread-actions';
import { AICharacter, ChatThread } from '@/types/database';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<AICharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<AICharacter | null>(null);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = session?.user?.id || session?.user?.email;
      
      if (!userId) {
        console.error('User ID not found in session:', session);
        return;
      }
      
      const userCharacters = await getUserCharacters(userId);
      setCharacters(userCharacters);
      
      // 最初のキャラクターを自動選択
      if (userCharacters.length > 0 && !selectedCharacter) {
        setSelectedCharacter(userCharacters[0]);
      }
    } catch (error) {
      console.error('キャラクター読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, selectedCharacter]);

  const handleCharacterSelect = (character: AICharacter) => {
    setSelectedCharacter(character);
    setSelectedThread(null); // キャラクター変更時はスレッド選択をクリア
  };

  const handleThreadSelect = (thread: ChatThread) => {
    setSelectedThread(thread);
  };

  const handleNewThread = async () => {
    if (!selectedCharacter || !session?.user) return;
    
    try {
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      const newThreadId = await createThread(userId, selectedCharacter.id);
      
      // 新しく作成したスレッドを取得して選択状態にする
      const { getThreadById } = await import('@/lib/thread-actions');
      const newThread = await getThreadById(newThreadId);
      
      if (newThread) {
        setSelectedThread(newThread);
        // スレッドリストを更新
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const handleMessageSent = () => {
    // メッセージ送信後にスレッドリストを更新
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (session?.user?.id) {
      loadCharacters();
    }
  }, [session, status, router, loadCharacters]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-2xl">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              AI社員は眠らない 💤
            </h1>
            <p className="text-white/80">
              おかえりなさい、{session.user?.name}さん
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/create-character')}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform"
            >
              + 新しいAI社員
            </button>
            <button
              onClick={() => signOut()}
              className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* キャラクター一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>👥</span>
                AI社員一覧
                <span className="text-sm font-normal text-white/60">({characters.length})</span>
              </h2>
              
              <div className="space-y-3">
                {characters.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-5xl mb-3">😴</div>
                    <p className="text-white/80 mb-3 text-sm">
                      まだAI社員がいません
                    </p>
                    <button
                      onClick={() => router.push('/create-character')}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform text-sm"
                    >
                      最初のAI社員を作成
                    </button>
                  </div>
                ) : (
                  characters.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      isSelected={selectedCharacter?.id === character.id}
                      onClick={() => handleCharacterSelect(character)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* スレッド一覧 */}
          <div className="lg:col-span-1">
            {selectedCharacter ? (
              <ThreadList
                userId={session.user?.id || session.user?.email || ''}
                characterId={selectedCharacter.id}
                selectedThreadId={selectedThread?.id}
                onThreadSelect={handleThreadSelect}
                onNewThread={handleNewThread}
                refreshTrigger={refreshTrigger}
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 h-full flex items-center justify-center">
                <p className="text-white/60 text-sm text-center">
                  AI社員を選択すると<br />会話履歴が表示されます
                </p>
              </div>
            )}
          </div>

          {/* チャット画面 */}
          <div className="lg:col-span-2">
            {selectedCharacter ? (
              <ChatInterface 
                character={selectedCharacter} 
                thread={selectedThread}
                onThreadUpdate={(thread) => setSelectedThread(thread)}
                onMessageSent={handleMessageSent}
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center h-[600px] flex items-center justify-center">
                <div>
                  <div className="text-8xl mb-6">😴</div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    AI社員を選択してください
                  </h3>
                  <p className="text-white/80 mb-6">
                    左のリストからAI社員を選んでチャットを開始しましょう
                  </p>
                  
                  {characters.length === 0 && (
                    <div className="bg-white/10 rounded-xl p-6 max-w-md mx-auto">
                      <h4 className="font-bold text-white mb-3">💡 はじめ方</h4>
                      <ol className="text-left text-white/80 text-sm space-y-2">
                        <li>1. 「+ 新しいAI社員」ボタンをクリック</li>
                        <li>2. お好みのキャラクターを作成</li>
                        <li>3. ダッシュボードに戻ってチャット開始！</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <footer className="text-center mt-12 text-white/60 text-sm">
          <p>
            AI社員は眠らない - あなただけのAI社員プラットフォーム
          </p>
          <p className="mt-1">
            Powered by Claude AI & Next.js
          </p>
        </footer>
      </div>
    </div>
  );
}