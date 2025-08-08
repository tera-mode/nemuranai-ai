'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleGetStarted = () => {
    router.push('/auth/signin');
  };

  const handleCreateCharacter = () => {
    if (session) {
      router.push('/create-character');
    } else {
      router.push('/auth/signin');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">💤</div>
              <h1 className="text-2xl font-bold text-slate-900">AI社員は眠らない</h1>
            </div>
            <button 
              onClick={handleGetStarted}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            あなただけの
            <span className="text-indigo-600 block">AI社員</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto">
            個性豊かなキャラクターを作成し、24時間いつでも仕事をサポートしてもらいましょう。
            ドラゴンからアンドロイドまで、あなたの理想のパートナーを見つけてください。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button 
              onClick={handleCreateCharacter}
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
            >
              AI社員を作成する
            </button>
            <button 
              onClick={handleGetStarted}
              className="bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
            >
              デモを見る
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">豊富なキャラクター</h3>
              <p className="text-slate-600">
                ドラゴン、エルフ、アンドロイドなど6つの種族から選択。
                それぞれ独特の個性と能力を持っています。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">自然な会話</h3>
              <p className="text-slate-600">
                Claude AIによる高度な自然言語処理で、
                まるで人間のような自然な対話を実現。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">24時間対応</h3>
              <p className="text-slate-600">
                営業、マーケティング、分析など専門分野に特化した
                AI社員が24時間あなたをサポート。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="text-2xl">💤</div>
            <span className="text-xl font-semibold">AI社員は眠らない</span>
          </div>
          <p className="text-slate-400">
            Powered by Claude AI & Next.js
          </p>
        </div>
      </footer>
    </div>
  )
}