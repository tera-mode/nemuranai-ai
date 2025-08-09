'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCharacterById } from '@/lib/character-actions';
import { getThreadById } from '@/lib/thread-actions';
import { AICharacter, ChatThread } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { ChatInterface } from '@/components/ChatInterface';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;
  const threadId = params.threadId as string;
  
  const [character, setCharacter] = useState<AICharacter | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [characterData, threadData] = await Promise.all([
        getCharacterById(characterId),
        getThreadById(threadId)
      ]);
      
      setCharacter(characterData);
      setThread(threadData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterId, threadId]);

  const handleThreadUpdate = (updatedThread: ChatThread) => {
    setThread(updatedThread);
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

  if (!session || !character || !thread) {
    return null;
  }

  return (
    <div className="min-h-screen relative flex flex-col">
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
        title={thread.title || `${character.name}との会話`}
        onBack={() => router.push(`/character/${characterId}/threads`)}
        rightComponent={<HamburgerMenu />}
      />

      {/* チャットインターフェース - フル画面 */}
      <div className="relative z-10 flex-1 pt-20">
        <ChatInterface 
          character={character} 
          thread={thread}
          onThreadUpdate={handleThreadUpdate}
          onMessageSent={() => {}}
          fullScreen={true}
        />
      </div>
    </div>
  );
}