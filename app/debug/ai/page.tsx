'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DebugAuth from '@/components/DebugAuth';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  responseTime?: number;
}

export default function AIDebugPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'image' | 'chat' | 'translate'>('image');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // 画像生成テスト
  const [imagePrompt, setImagePrompt] = useState('beautiful anime girl with long black hair, business suit, professional, high quality');
  const [generatedImage, setGeneratedImage] = useState<string>('');

  // チャットテスト
  const [chatMessage, setChatMessage] = useState('こんにちは！今日の天気はどうですか？');
  const [chatResponse, setChatResponse] = useState<string>('');

  // 翻訳テスト
  const [translateText, setTranslateText] = useState('Hello, how are you today?');
  const [translatedText, setTranslatedText] = useState<string>('');

  const testImageGeneration = async () => {
    if (!session?.user) return;

    setLoading(true);
    setResult(null);
    setGeneratedImage('');

    const startTime = Date.now();
    
    try {
      const requestBody = {
        prompt: imagePrompt,
        userId: session.user.id || session.user.email,
        characterId: 'debug-test'
      };

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const data = await response.json();

      if (data.success || response.ok) {
        setGeneratedImage(data.imageUrl || '');
        setResult({
          success: true,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            imageUrl: data.imageUrl,
            isFirebase: data.isFirebase,
            isTemp: data.isTemp,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      } else {
        setResult({
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        data: {
          request: requestBody || {},
          errorDetails: error
        },
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testChatAPI = async () => {
    setLoading(true);
    setResult(null);
    setChatResponse('');

    const startTime = Date.now();
    
    try {
      const requestBody = {
        message: chatMessage,
        characterId: 'debug-test',
        threadId: 'debug-thread'
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const data = await response.json();

      if (data.success || response.ok) {
        setChatResponse(data.response || data.message || 'レスポンスが空です');
        setResult({
          success: true,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            aiResponse: data.response || data.message,
            model: data.model,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      } else {
        setResult({
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        data: {
          request: {
            message: chatMessage,
            characterId: 'debug-test',
            threadId: 'debug-thread'
          },
          errorDetails: error
        },
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testTranslateAPI = async () => {
    setLoading(true);
    setResult(null);
    setTranslatedText('');

    const startTime = Date.now();
    
    try {
      const requestBody = {
        text: translateText,
        targetLanguage: 'ja'
      };

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const endTime = Date.now();
      const data = await response.json();

      if (data.success || response.ok) {
        setTranslatedText(data.translatedText || '');
        setResult({
          success: true,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            originalText: translateText,
            translatedText: data.translatedText,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      } else {
        setResult({
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          data: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            request: requestBody,
            response: data,
            fullResponseData: data
          },
          responseTime: endTime - startTime
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        data: {
          request: requestBody || {},
          errorDetails: error
        },
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DebugAuth>
      <div className="min-h-screen relative">
        {/* 背景画像 */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        
        {/* ヘッダー */}
        <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/debug')}
                className="text-white/60 hover:text-white text-2xl"
              >
                ←
              </button>
              <div className="text-3xl">🤖</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">AI チューニング</h1>
                <p className="text-white/60 text-sm">AI機能のテストとデバッグ</p>
              </div>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {/* タブ */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => setActiveTab('image')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'image' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              画像生成
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              チャット
            </button>
            <button
              onClick={() => setActiveTab('translate')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'translate' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              翻訳
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 入力エリア */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">
                {activeTab === 'image' && '画像生成テスト'}
                {activeTab === 'chat' && 'チャットテスト'}
                {activeTab === 'translate' && '翻訳テスト'}
              </h3>
              
              {/* 画像生成 */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      画像生成プロンプト
                    </label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="画像生成プロンプトを入力..."
                    />
                  </div>
                  <button
                    onClick={testImageGeneration}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? '生成中...' : '画像生成テスト'}
                  </button>
                </div>
              )}

              {/* チャット */}
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      テストメッセージ
                    </label>
                    <textarea
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="チャットメッセージを入力..."
                    />
                  </div>
                  <button
                    onClick={testChatAPI}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? '処理中...' : 'チャットテスト'}
                  </button>
                </div>
              )}

              {/* 翻訳 */}
              {activeTab === 'translate' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      翻訳テキスト（英語→日本語）
                    </label>
                    <textarea
                      value={translateText}
                      onChange={(e) => setTranslateText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="翻訳するテキストを入力..."
                    />
                  </div>
                  <button
                    onClick={testTranslateAPI}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? '翻訳中...' : '翻訳テスト'}
                  </button>
                </div>
              )}
            </div>

            {/* 結果エリア */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">テスト結果</h3>
              
              {loading && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/80">処理中...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* ステータス */}
                  <div className={`p-4 rounded-xl ${result.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{result.success ? '✅' : '❌'}</span>
                      <span className={`font-bold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                        {result.success ? 'テスト成功' : 'テスト失敗'}
                      </span>
                      {result.data?.httpStatus && (
                        <span className={`px-2 py-1 rounded text-xs font-mono ${
                          result.data.httpStatus >= 200 && result.data.httpStatus < 300 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          HTTP {result.data.httpStatus}
                        </span>
                      )}
                      {result.responseTime && (
                        <span className="text-white/60 text-sm ml-auto">
                          {result.responseTime}ms
                        </span>
                      )}
                    </div>
                    {result.error && (
                      <p className="text-red-200 text-sm">{result.error}</p>
                    )}
                    {result.data?.httpStatusText && (
                      <p className="text-white/60 text-xs mt-1">
                        Status: {result.data.httpStatusText}
                      </p>
                    )}
                  </div>

                  {/* 結果表示 */}
                  {result.success && (
                    <div className="space-y-4">
                      {/* 画像結果 */}
                      {activeTab === 'image' && generatedImage && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-white/80 text-sm mb-2">生成された画像:</p>
                            <img
                              src={generatedImage}
                              alt="Generated"
                              className="w-full max-w-sm rounded-xl"
                            />
                            <div className="mt-2 text-xs text-white/60">
                              <p>保存先: {result.data?.isFirebase ? 'Firebase Storage' : '一時ストレージ'}</p>
                              <p>URL: {generatedImage}</p>
                            </div>
                          </div>
                          
                          {/* 詳細レスポンス情報 */}
                          <div>
                            <p className="text-white/80 text-sm mb-2">詳細レスポンス情報:</p>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/20">
                              <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* チャット結果 */}
                      {activeTab === 'chat' && chatResponse && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-white/80 text-sm mb-2">AI応答:</p>
                            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                              <p className="text-white leading-relaxed whitespace-pre-wrap">{chatResponse}</p>
                            </div>
                          </div>
                          
                          {/* 詳細レスポンス情報 */}
                          <div>
                            <p className="text-white/80 text-sm mb-2">詳細レスポンス情報:</p>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/20">
                              <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 翻訳結果 */}
                      {activeTab === 'translate' && translatedText && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-white/80 text-sm mb-2">翻訳結果:</p>
                            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                              <p className="text-white leading-relaxed">{translatedText}</p>
                            </div>
                          </div>
                          
                          {/* 詳細レスポンス情報 */}
                          <div>
                            <p className="text-white/80 text-sm mb-2">詳細レスポンス情報:</p>
                            <div className="bg-black/20 rounded-xl p-4 border border-white/20">
                              <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* デバッグ情報（成功・失敗問わず表示） */}
                  {result.data && (
                    <div>
                      <p className="text-white/80 text-sm mb-2">🔧 デバッグ情報:</p>
                      <div className="bg-black/30 rounded-xl p-4 border border-white/20">
                        <pre className="text-xs text-cyan-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-8">
                  <p className="text-white/60">テストを実行してください</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DebugAuth>
  );
}