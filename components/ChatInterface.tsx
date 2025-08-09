'use client';

import { useState, useRef, useEffect } from 'react';
import { AICharacter, ChatThread, ChatMessage } from '@/types/database';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { getThreadMessages } from '@/lib/thread-actions';
import { detectDesignRequest } from '@/lib/design-detection';
import { DesignJobFlow } from '@/components/DesignJobFlow';

interface ChatInterfaceProps {
  character: AICharacter;
  thread: ChatThread | null;
  onThreadUpdate?: (thread: ChatThread) => void;
  onMessageSent?: () => void; // メッセージ送信後のコールバック
  fullScreen?: boolean; // フルスクリーンレイアウトフラグ
}

export function ChatInterface({ character, thread, onThreadUpdate, onMessageSent, fullScreen = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDesignFlow, setShowDesignFlow] = useState(false);
  const [designRequest, setDesignRequest] = useState<{ useCase: any; brief: string } | null>(null);
  const [sessionNotFoundLogged, setSessionNotFoundLogged] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const designCompletedRef = useRef<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // スレッドが変更されたときにメッセージを読み込む
  useEffect(() => {
    const loadMessages = async () => {
      if (!thread) {
        setMessages([]);
        designCompletedRef.current = false;
        return;
      }

      try {
        designCompletedRef.current = false;
        const threadMessages = await getThreadMessages(thread.id);
        setMessages(threadMessages);
      } catch (error) {
        console.error('Error loading thread messages:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [thread]);

  // デザイン生成状況をポーリング
  useEffect(() => {
    if (!thread || character.domain !== 'designer') return;
    
    // 最新のメッセージに「AIが作業中です...」が含まれているかチェック
    const lastMessage = messages[messages.length - 1];
    const isGeneratingMessage = lastMessage && 
      lastMessage.type === 'assistant' && 
      lastMessage.content.includes('AIが作業中です...') &&
      !lastMessage.content.includes('完成しました');
    
    if (isGeneratingMessage && !pollingIntervalRef.current && !designCompletedRef.current) {
      console.log('🎯 Starting design status polling...');
      let errorCount = 0;
      const maxErrors = 3;
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          console.log('🔄 Polling design session status for thread:', thread.id);
          const response = await fetch(`/api/design-session/${thread.id}`);
          
          if (response.ok) {
            const sessionData = await response.json();
            console.log('📊 Session status:', sessionData);
            
            if (sessionData.status === 'reviewing' && sessionData.generatedImages?.length > 0) {
              console.log('✅ Design completed! Refreshing messages...');
              
              // 完了フラグを設定してポーリング停止
              designCompletedRef.current = true;
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
              }
              
              // デザイン完了 - メッセージを再読み込み
              const updatedMessages = await getThreadMessages(thread.id);
              setMessages(updatedMessages);
              
              // スレッドリストも更新
              if (onMessageSent) {
                onMessageSent();
              }
            } else if (sessionData.status === 'failed') {
              console.log('❌ Design failed! Refreshing messages...');
              
              // 完了フラグを設定してポーリング停止
              designCompletedRef.current = true;
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
              }
              
              // デザイン失敗 - メッセージを再読み込み
              const updatedMessages = await getThreadMessages(thread.id);
              setMessages(updatedMessages);
            }
          } else if (response.status === 404) {
            errorCount++;
            // 複数回エラーが発生した場合のみポーリングを停止
            if (errorCount >= maxErrors) {
              if (!sessionNotFoundLogged) {
                console.log(`🚫 Design session not found after ${maxErrors} attempts, stopping poll`);
                setSessionNotFoundLogged(true);
              }
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
              }
            } else {
              console.log(`⚠️ Design session not found (attempt ${errorCount}/${maxErrors}), retrying...`);
            }
          } else {
            // リセット成功した場合のエラーカウント
            errorCount = 0;
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // 3秒ごとにポーリング
      
      // 2分後にタイムアウト
      pollingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Polling timeout, stopping');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingTimeoutRef.current = null;
      }, 120000);
    } else if (!isGeneratingMessage && pollingIntervalRef.current) {
      // 生成メッセージがなくなったらポーリング停止
      console.log('🛑 No generating message, stopping poll');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    }
  }, [messages, thread?.id, character.domain, onMessageSent]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    
    // 古いデザインフローは無効化 - 新しい対話型システムを使用
    // const designDetection = detectDesignRequest(messageText, character.domain);
    // 
    // if (designDetection.detected && designDetection.useCase) {
    //   setDesignRequest({
    //     useCase: designDetection.useCase,
    //     brief: messageText
    //   });
    //   setShowDesignFlow(true);
    //   setInput('');
    //   return;
    // }
    
    setInput('');
    setIsLoading(true);

    // 楽観的更新：ユーザーメッセージを即座に表示
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      threadId: thread?.id || '',
      characterId: character.id,
      userId: 'current-user',
      content: messageText,
      type: 'user',
      timestamp: new Date(),
      isMarkdown: false
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          characterId: character.id,
          threadId: thread?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // スレッドが新しく作成された場合、スレッド情報を更新
        if (data.threadId && !thread) {
          // 新しいスレッド情報を取得して親コンポーネントに通知
          // これにより ThreadList が更新される
        }

        // メッセージを再読み込み（サーバーから正確なデータを取得）
        if (data.threadId) {
          const updatedMessages = await getThreadMessages(data.threadId);
          setMessages(updatedMessages);
          
          // スレッドリストを更新するためにコールバックを実行
          if (onMessageSent) {
            onMessageSent();
            
            // タイトルが生成された場合は複数回更新
            if (data.titleGenerated) {
              setTimeout(() => {
                onMessageSent();
              }, 500);
              setTimeout(() => {
                onMessageSent();
              }, 2000);
            }
          }
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Chat error:', error);
      // エラーメッセージを追加
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        threadId: thread?.id || '',
        characterId: character.id,
        userId: 'system',
        content: 'ごめんなさい...今ちょっと調子が悪いみたいです。少し時間をおいてから、もう一度話しかけてくれませんか？',
        type: 'assistant',
        timestamp: new Date(),
        isMarkdown: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRaceEmoji = (race: string) => {
    const raceEmojis: Record<string, string> = {
      dragon: '🐲',
      elf: '🧝‍♀️',
      android: '🤖',
      ghost: '👻',
      mage: '🧙‍♀️',
      genius: '👶'
    };
    return raceEmojis[race] || '👤';
  };

  const getDomainEmoji = (domain: string) => {
    const domainEmojis: Record<string, string> = {
      sales: '💼',
      marketing: '📱',
      support: '🛡️',
      analysis: '📊',
      secretary: '📋',
      strategy: '🎯'
    };
    return domainEmojis[domain] || '💼';
  };

  if (!thread) {
    return (
      <div className={`bg-white/10 backdrop-blur-md ${fullScreen ? '' : 'rounded-2xl'} p-6 ${fullScreen ? 'h-full' : 'h-[600px]'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-8xl mb-6">💬</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            会話を選択してください
          </h3>
          <p className="text-white/80 mb-6">
            左のスレッド一覧から会話を選ぶか、新しい会話を始めましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fullScreen ? 'fixed inset-0 pt-20 flex flex-col' : 'bg-white/10 backdrop-blur-md rounded-2xl p-6 h-[600px] flex flex-col'}`}>
      {/* ヘッダー */}
      <div className={`flex items-center gap-3 pb-4 border-b border-white/20 ${fullScreen ? 'px-6 bg-black/20 backdrop-blur-md' : ''}`}>
        {/* プロフィール画像またはアバター */}
        <div className="flex-shrink-0">
          {character.profileImageUrl ? (
            <div 
              className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-white/30"
              style={{ backgroundImage: `url(${character.profileImageUrl})` }}
            />
          ) : (
            <div className="text-4xl">
              {getRaceEmoji(character.race)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{character.name}</h3>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span>{getDomainEmoji(character.domain)}</span>
            <span>{character.domain}専門</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-2"></div>
            <span className="text-green-400">オンライン</span>
          </div>
          <p className="text-sm text-white/60 mt-1">{thread.title}</p>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-4 ${fullScreen ? 'px-6' : ''}`}>
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">👋</div>
            <p className="text-white/80">
              新しい会話が始まります。{character.name}に話しかけてみましょう！
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI社員のアバター */}
            {message.type === 'assistant' && (
              <div className="flex-shrink-0">
                {character.profileImageUrl ? (
                  <div 
                    className="w-8 h-8 rounded-full bg-cover bg-center border border-white/30"
                    style={{ backgroundImage: `url(${character.profileImageUrl})` }}
                  />
                ) : (
                  <div className="text-2xl">
                    {getRaceEmoji(character.race)}
                  </div>
                )}
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/20 text-white border border-white/30'
              }`}
            >
              {message.isMarkdown && message.type === 'assistant' ? (
                <div className="text-sm leading-relaxed">
                  <MarkdownRenderer 
                    content={message.content} 
                    className="prose-sm" 
                  />
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
              
              {/* 画像表示エリア */}
              {message.images && message.images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.images.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={imageUrl} 
                        alt={`Generated image ${index + 1}`}
                        className="max-w-full h-auto rounded-lg shadow-lg border border-white/20"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-white/80' : 'text-white/60'
              }`}>
                {message.timestamp.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            {/* AI社員のアバター */}
            <div className="flex-shrink-0">
              {character.profileImageUrl ? (
                <div 
                  className="w-8 h-8 rounded-full bg-cover bg-center border border-white/30"
                  style={{ backgroundImage: `url(${character.profileImageUrl})` }}
                />
              ) : (
                <div className="text-2xl">
                  {getRaceEmoji(character.race)}
                </div>
              )}
            </div>
            
            <div className="bg-white/20 rounded-2xl px-4 py-3 border border-white/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-white/80 text-sm ml-2">返答を考えています...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className={`pt-4 border-t border-white/20 ${fullScreen ? 'px-6 pb-6 bg-black/20 backdrop-blur-md' : ''}`}>
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${character.name}に話しかけてみましょう...`}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-purple-400 focus:outline-none resize-none disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            送信
          </button>
        </div>
        
        <div className="mt-2 text-xs text-white/60">
          Enterで送信 / Shift+Enterで改行
        </div>
      </div>

      {/* 古いDesign Job Flow Modalは無効化 */}
      {/* {showDesignFlow && designRequest && (
        <DesignJobFlow
          character={character}
          useCase={designRequest.useCase}
          brief={designRequest.brief}
          onClose={() => {
            setShowDesignFlow(false);
            setDesignRequest(null);
          }}
          onJobCreated={(jobId) => {
            // Add a system message about job creation
            const jobMessage: ChatMessage = {
              id: `job-${Date.now()}`,
              threadId: thread?.id || '',
              characterId: character.id,
              userId: 'system',
              content: `✨ デザインジョブを作成しました！進行状況は右上のメニューから確認できます。\n\nジョブID: ${jobId}`,
              type: 'assistant',
              timestamp: new Date(),
              isMarkdown: false
            };
            setMessages(prev => [...prev, jobMessage]);
          }}
        />
      )} */}
    </div>
  );
}