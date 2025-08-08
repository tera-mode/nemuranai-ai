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
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: selectedCharacter?.profileImageUrl 
              ? `url(${selectedCharacter.profileImageUrl})` 
              : 'url(/bg001.jpg)' 
          }}
        />
        <div className={`fixed inset-0 backdrop-blur-[2px] ${
          selectedCharacter?.profileImageUrl 
            ? 'bg-black/60' 
            : 'bg-black/40'
        }`} />
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
      {/* 背景画像 - 選択されたキャラクターまたはデフォルト */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: selectedCharacter?.profileImageUrl 
            ? `url(${selectedCharacter.profileImageUrl})` 
            : 'url(/bg001.jpg)' 
        }}
      />
      {/* 背景オーバーレイ - キャラクター画像の場合は強めに */}
      <div className={`fixed inset-0 backdrop-blur-[2px] transition-all duration-1000 ${
        selectedCharacter?.profileImageUrl 
          ? 'bg-gradient-to-br from-black/40 via-black/60 to-black/80' 
          : 'bg-black/30'
      }`} />
      
      {/* キャラクター画像用の追加グラデーションオーバーレイ */}
      {selectedCharacter?.profileImageUrl && (
        <div className="fixed inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-1000" />
      )}
      
      {/* コンテンツ */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="flex justify-between items-center mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              AI社員は眠らない 💤
            </h1>
            <p className="text-white/90 drop-shadow">
              おかえりなさい、{session.user?.name}さん
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/create-character')}
              className="bg-gradient-to-r from-green-500/90 to-blue-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform border border-white/20 drop-shadow-lg"
            >
              + 新しいAI社員
            </button>
            <button
              onClick={() => signOut()}
              className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors border border-white/20 drop-shadow-lg"
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* キャラクター一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 drop-shadow">
                <span>👥</span>
                AI社員一覧
                <span className="text-sm font-normal text-white/80">({characters.length})</span>
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
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 h-full flex items-center justify-center border border-white/20 shadow-2xl">
                <p className="text-white/80 text-sm text-center drop-shadow">
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
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 text-center h-[600px] flex items-center justify-center border border-white/20 shadow-2xl">
                <div>
                  <div className="text-8xl mb-6">😴</div>
                  <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                    AI社員を選択してください
                  </h3>
                  <p className="text-white/90 mb-6 drop-shadow">
                    左のリストからAI社員を選んでチャットを開始しましょう
                  </p>
                  
                  {characters.length === 0 && (
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto border border-white/20">
                      <h4 className="font-bold text-white mb-3 drop-shadow">💡 はじめ方</h4>
                      <ol className="text-left text-white/90 text-sm space-y-2 drop-shadow">
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
        <footer className="text-center mt-12 text-white/80 text-sm bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <p className="drop-shadow">
            AI社員は眠らない - あなただけのAI社員プラットフォーム
          </p>
          <p className="mt-1 drop-shadow">
            Powered by Claude AI & Next.js
          </p>
        </footer>
      </div>
    </div>
  );
}