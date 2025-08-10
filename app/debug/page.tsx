'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import DebugAuth from '@/components/DebugAuth';
import { clearDebugAuthStatus } from '@/lib/debug-auth';

interface SystemStatus {
  environment: string;
  buildTime: string;
  firebaseStatus: string;
  adminSdkStatus: string;
  totalUsers: number;
  totalCharacters: number;
  storageFiles: number;
}

export default function DebugDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      
      // 複数のAPIから情報を収集
      const [usersRes, charactersRes, storageRes] = await Promise.all([
        fetch('/api/debug/users'),
        fetch('/api/debug/characters'),
        fetch('/api/debug/storage')
      ]);

      const [users, characters, storage] = await Promise.all([
        usersRes.json(),
        charactersRes.json(),
        storageRes.json()
      ]);

      setSystemStatus({
        environment: process.env.NODE_ENV || 'unknown',
        buildTime: new Date().toISOString(),
        firebaseStatus: storage.success ? '✅ 正常' : '❌ エラー',
        adminSdkStatus: storage.adminSdkAvailable ? '✅ 利用可能' : '❌ 無効',
        totalUsers: users.totalUsers || 0,
        totalCharacters: characters.totalCharacters || 0,
        storageFiles: storage.totalFiles || 0
      });
    } catch (error) {
      console.error('システム状態取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearDebugAuthStatus();
    router.push('/');
  };

  const debugMenuItems = [
    {
      title: 'AI チューニング',
      description: 'AIプロンプトとレスポンス分析、モデル設定調整',
      path: '/debug/ai',
      icon: '🤖',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'ユーザー管理',
      description: 'ユーザーデータ確認、キャラクター管理、統計情報',
      path: '/debug/users',
      icon: '👥',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'ストレージ管理',
      description: 'Firebase Storage、一時ストレージ、画像管理',
      path: '/debug/storage',
      icon: '💾',
      color: 'from-purple-500 to-violet-500'
    },
    {
      title: 'システム分析',
      description: 'アクセス分析、エラーログ、パフォーマンス監視',
      path: '/debug/analytics',
      icon: '📊',
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'システム情報',
      description: '環境変数、API状態、サーバー情報',
      path: '/debug/system',
      icon: '⚙️',
      color: 'from-gray-500 to-slate-500'
    }
  ];

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
              <div className="text-3xl">🛠️</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">Debug Dashboard</h1>
                <p className="text-white/60 text-sm">管理者: {session?.user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={fetchSystemStatus}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
              >
                🔄 更新
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white text-sm transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {/* システム状態 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">システム状態</h2>
            {loading ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-white/80">状態確認中...</p>
              </div>
            ) : systemStatus ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">環境</p>
                    <p className="text-white font-bold">{systemStatus.environment}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">Firebase</p>
                    <p className="text-white font-bold">{systemStatus.firebaseStatus}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">Admin SDK</p>
                    <p className="text-white font-bold">{systemStatus.adminSdkStatus}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">ユーザー数</p>
                    <p className="text-white font-bold">{systemStatus.totalUsers}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">キャラクター数</p>
                    <p className="text-white font-bold">{systemStatus.totalCharacters}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-xs mb-1">ファイル数</p>
                    <p className="text-white font-bold">{systemStatus.storageFiles}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-6 border border-red-500/30 text-center">
                <p className="text-red-300">システム状態の取得に失敗しました</p>
              </div>
            )}
          </div>

          {/* デバッグメニュー */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 drop-shadow-lg">デバッグツール</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debugMenuItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition-all duration-300 hover:scale-105"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.description}</p>
                  <div className="mt-4 flex justify-end">
                    <span className="text-white/50 text-sm">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DebugAuth>
  );
}