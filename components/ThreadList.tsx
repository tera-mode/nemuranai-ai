'use client';

import { useState, useEffect } from 'react';
import { ChatThread } from '@/types/database';
import { getUserThreads } from '@/lib/thread-actions';

interface ThreadListProps {
  userId: string;
  characterId: string;
  selectedThreadId?: string;
  onThreadSelect: (thread: ChatThread) => void;
  onNewThread: () => void;
  refreshTrigger?: number; // スレッドリストの更新トリガー
}

export function ThreadList({ 
  userId, 
  characterId, 
  selectedThreadId, 
  onThreadSelect, 
  onNewThread,
  refreshTrigger 
}: ThreadListProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading threads for character:', characterId, 'trigger:', refreshTrigger);
        const userThreads = await getUserThreads(userId, characterId);
        console.log('📋 Loaded threads:', userThreads.map(t => ({ id: t.id, title: t.title })));
        setThreads(userThreads);
      } catch (error) {
        console.error('Error loading threads:', error);
        // エラー時は空の配列を設定してUIを正常に表示
        setThreads([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && characterId) {
      loadThreads();
    } else {
      setThreads([]);
      setIsLoading(false);
    }
  }, [userId, characterId, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span>💬</span>
          <h3 className="text-lg font-bold text-white">会話履歴</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-white/60">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span>💬</span>
          <h3 className="text-lg font-bold text-white">会話履歴</h3>
          <span className="text-sm font-normal text-white/60">({threads.length})</span>
        </div>
        <button
          onClick={onNewThread}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
        >
          + 新規
        </button>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💭</div>
            <p className="text-white/80 mb-3">まだ会話がありません</p>
            <button
              onClick={onNewThread}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform"
            >
              最初の会話を始める
            </button>
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onThreadSelect(thread)}
              className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-white/20 ${
                selectedThreadId === thread.id 
                  ? 'bg-white/20 border border-white/30' 
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">
                    {thread.title}
                  </h4>
                  {thread.lastMessage && (
                    <p className="text-white/70 text-xs mt-1 line-clamp-2">
                      {thread.lastMessage}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                    <span>{thread.messageCount}件</span>
                    <span>
                      {new Date(thread.updatedAt).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}