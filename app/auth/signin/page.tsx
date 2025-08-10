'use client';

import { signIn, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push('/home');
      }
    });
  }, [router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        isSignUp: isSignUp.toString(),
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        setSuccess(isSignUp ? 'アカウントが作成されました！ダッシュボードに移動します...' : 'ログイン成功！ダッシュボードに移動します...');
        
        // 少し遅延を入れてからリダイレクト
        setTimeout(() => {
          window.location.href = '/home';
        }, 1500);
      } else {
        setError('認証に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景画像 */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg001.jpg)' }}
      />
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      {/* Header */}
      <header className="relative z-50 flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          <img 
            src="/nemuranai-ai_logo.png" 
            alt="AI社員は眠らない ロゴ" 
            className="h-16 w-auto drop-shadow-lg"
          />
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-white/90 hover:text-white transition-colors drop-shadow-lg"
        >
          ← ホームに戻る
        </button>
      </header>

      {/* Auth Form */}
      <div className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </h2>
            <p className="text-white/90 drop-shadow">
              {isSignUp 
                ? 'AI社員と一緒に働きましょう' 
                : 'AI社員があなたを待っています'
              }
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2 drop-shadow">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-colors text-white placeholder:text-white/60 backdrop-blur-sm"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2 drop-shadow">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-colors text-white placeholder:text-white/60 backdrop-blur-sm"
                placeholder="6文字以上"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-100 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-400/30 text-green-100 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform backdrop-blur-sm"
            >
              {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-white/80 hover:text-white text-sm transition-colors drop-shadow"
            >
              {isSignUp 
                ? '既にアカウントをお持ちの方はこちら' 
                : 'アカウントをお持ちでない方はこちら'
              }
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-white/30"></div>
            <span className="px-4 text-white/70 text-sm drop-shadow">または</span>
            <div className="flex-1 border-t border-white/30"></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/home' })}
            className="w-full bg-white/20 border border-white/30 text-white py-3 px-4 rounded-lg font-semibold hover:bg-white/30 flex items-center justify-center gap-3 transition-colors backdrop-blur-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Googleでログイン
          </button>

          <p className="text-center text-white/60 text-xs mt-6 drop-shadow">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなします
          </p>
        </div>
      </div>
    </div>
  );
}