'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DebugAuth from '@/components/DebugAuth';

interface SystemInfo {
  environment: {
    nodeEnv: string;
    platform: string;
    version: string;
    timestamp: string;
  };
  apis: {
    stability: boolean;
    anthropic: boolean;
    firebase: boolean;
    nextauth: boolean;
  };
  services: {
    firebaseAdmin: boolean;
    firebaseClient: boolean;
    storage: boolean;
    auth: boolean;
  };
  env: {
    [key: string]: boolean;
  };
}

export default function SystemDebugPage() {
  const router = useRouter();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/debug/system');
      const data = await response.json();

      setSystemInfo(data);
    } catch (error) {
      console.error('システム情報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => (
    <span className={`text-lg ${status ? 'text-green-400' : 'text-red-400'}`}>
      {status ? '✅' : '❌'}
    </span>
  );

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
              <div className="text-3xl">⚙️</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">システム情報</h1>
                <p className="text-white/60 text-sm">環境変数・API状態・サービス情報</p>
              </div>
            </div>
            
            <button
              onClick={fetchSystemInfo}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/80">システム情報を取得中...</p>
            </div>
          ) : systemInfo ? (
            <div className="space-y-6">
              
              {/* 環境情報 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌍</span>
                  環境情報
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Node環境</p>
                    <p className="text-white font-bold">{systemInfo.environment.nodeEnv}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">プラットフォーム</p>
                    <p className="text-white font-bold">{systemInfo.environment.platform}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">バージョン</p>
                    <p className="text-white font-bold">{systemInfo.environment.version}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">取得時刻</p>
                    <p className="text-white font-bold text-xs">{new Date(systemInfo.environment.timestamp).toLocaleString('ja-JP')}</p>
                  </div>
                </div>
              </div>

              {/* API状態 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔌</span>
                  API状態
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Stability AI</p>
                      <p className="text-white/60 text-sm">画像生成</p>
                    </div>
                    <StatusIcon status={systemInfo.apis.stability} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Anthropic</p>
                      <p className="text-white/60 text-sm">チャット</p>
                    </div>
                    <StatusIcon status={systemInfo.apis.anthropic} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Firebase</p>
                      <p className="text-white/60 text-sm">データベース</p>
                    </div>
                    <StatusIcon status={systemInfo.apis.firebase} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">NextAuth</p>
                      <p className="text-white/60 text-sm">認証</p>
                    </div>
                    <StatusIcon status={systemInfo.apis.nextauth} />
                  </div>
                </div>
              </div>

              {/* サービス状態 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🛠️</span>
                  サービス状態
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Firebase Admin</p>
                      <p className="text-white/60 text-sm">サーバーサイド</p>
                    </div>
                    <StatusIcon status={systemInfo.services.firebaseAdmin} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Firebase Client</p>
                      <p className="text-white/60 text-sm">クライアントサイド</p>
                    </div>
                    <StatusIcon status={systemInfo.services.firebaseClient} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Storage</p>
                      <p className="text-white/60 text-sm">ファイル保存</p>
                    </div>
                    <StatusIcon status={systemInfo.services.storage} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Auth</p>
                      <p className="text-white/60 text-sm">認証システム</p>
                    </div>
                    <StatusIcon status={systemInfo.services.auth} />
                  </div>
                </div>
              </div>

              {/* 環境変数 */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔑</span>
                  環境変数状態
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(systemInfo.env).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium font-mono text-sm">{key}</p>
                        <p className="text-white/60 text-xs">
                          {key.includes('SECRET') || key.includes('KEY') ? '機密情報' : '設定値'}
                        </p>
                      </div>
                      <StatusIcon status={value} />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-6 border border-red-500/30 text-center">
              <p className="text-red-300">システム情報の取得に失敗しました</p>
            </div>
          )}
        </div>
      </div>
    </DebugAuth>
  );
}