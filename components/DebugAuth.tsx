'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdminUser, verifyAdminPassword, setDebugAuthStatus, getDebugAuthStatus } from '@/lib/debug-auth';

interface DebugAuthProps {
  children: React.ReactNode;
}

export default function DebugAuth({ children }: DebugAuthProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    // セッションがない場合はサインインページへ
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // 管理者メールでない場合はホームへリダイレクト
    if (!isAdminUser(session)) {
      router.push('/');
      return;
    }

    // 既に認証済みかチェック
    const authStatus = getDebugAuthStatus();
    if (authStatus) {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, [session, status, router]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verifyAdminPassword(password)) {
      setDebugAuthStatus(true);
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('パスワードが間違っています');
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-2xl drop-shadow-lg">認証確認中...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative">
        {/* 背景画像 */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        
        {/* 認証フォーム */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 border border-white/20 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🛠️</div>
              <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                デバッグモード
              </h1>
              <p className="text-white/80 text-sm">
                管理者パスワードを入力してください
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="管理者パスワードを入力"
                  required
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-300">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                認証
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/')}
                className="text-white/60 hover:text-white text-sm underline"
              >
                ← ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}