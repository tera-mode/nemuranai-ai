'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUserCharacters, getCharacterById } from '@/lib/character-actions';
import { getUserThreads, createThread } from '@/lib/thread-actions';
import { AICharacter, ChatThread } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { getDomainLabel, getPersonalityLabel, getRaceLabel } from '@/lib/translations';

export default function ThreadListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;
  
  const [character, setCharacter] = useState<AICharacter | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = session?.user?.id || session?.user?.email;
      
      if (!userId) {
        console.error('User ID not found in session:', session);
        return;
      }
      
      const [characterData, threadsData] = await Promise.all([
        getCharacterById(characterId),
        getUserThreads(userId, characterId)
      ]);
      
      setCharacter(characterData);
      setThreads(threadsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, characterId]);

  const handleNewThread = async () => {
    if (!session?.user || !character) return;
    
    try {
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      const newThreadId = await createThread(userId, character.id);
      router.push(`/character/${character.id}/chat/${newThreadId}`);
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const handleThreadSelect = (thread: ChatThread) => {
    router.push(`/character/${character?.id}/chat/${thread.id}`);
  };

  const handleEditCharacter = () => {
    router.push(`/character/${characterId}/edit`);
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: character?.profileImageUrl 
              ? `url(${character.profileImageUrl})` 
              : 'url(/bg001.jpg)' 
          }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!session || !character) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* 背景画像 */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: character.profileImageUrl 
            ? `url(${character.profileImageUrl})` 
            : 'url(/bg001.jpg)' 
        }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      {character.profileImageUrl && (
        <div className="fixed inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      )}
      
      {/* ヘッダー */}
      <PageHeader
        title={`${character.name}との会話`}
        onBack={() => router.push('/home')}
        rightComponent={<HamburgerMenu />}
      />

      {/* コンテンツ */}
      <div className="relative z-10 px-4 pt-20 pb-8">
        {/* キャラクター情報カード */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-center gap-4">
            {character.profileImageUrl && (
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                <img
                  src={character.profileImageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
                {character.name}
              </h2>
              <p className="text-white/90 text-sm drop-shadow">
                専門分野: {getDomainLabel(character.domain)}
              </p>
              <p className="text-white/80 text-xs mt-1 drop-shadow">
                {getPersonalityLabel(character.personality)} • {getRaceLabel(character.race)}
              </p>
            </div>
            <button
              onClick={handleEditCharacter}
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm border border-white/30 hover:bg-white/30 transition-colors"
            >
              編集
            </button>
          </div>
        </div>

        {/* 新しい会話ボタン */}
        <button
          onClick={handleNewThread}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-medium mb-6 hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-xl">💬</span>
          新しい会話を開始
        </button>

        {/* スレッド一覧 */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4 drop-shadow-lg">
            過去の会話 ({threads.length})
          </h3>
          
          {threads.length === 0 ? (
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
              <div className="text-5xl mb-4">💬</div>
              <h4 className="text-lg font-bold text-white mb-2 drop-shadow-lg">
                まだ会話がありません
              </h4>
              <p className="text-white/90 drop-shadow">
                「新しい会話を開始」ボタンから最初の会話を始めましょう
              </p>
            </div>
          ) : (
            <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread)}
                  className="w-full p-4 text-left border-b border-white/10 last:border-b-0 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1 drop-shadow">
                        {thread.title}
                      </h4>
                      <p className="text-white/80 text-sm drop-shadow">
                        最終更新: {thread.updatedAt.toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-white/40 ml-4">
                      →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}