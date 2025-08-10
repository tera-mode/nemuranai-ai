'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/home');
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
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

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
          onClick={handleGetStarted}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform drop-shadow-lg"
        >
          ログイン
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
            あなただけの
            <span className="text-purple-300 block">AI社員</span>
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto drop-shadow">
            個性豊かなキャラクターを作成し、24時間いつでも仕事をサポートしてもらいましょう。
            ドラゴンからアンドロイドまで、あなたの理想のパートナーを見つけてください。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button 
              onClick={handleCreateCharacter}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:scale-105 transition-transform shadow-lg drop-shadow-lg"
            >
              AI社員を作成する
            </button>
            <button 
              onClick={handleGetStarted}
              className="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/30 transition-colors border border-white/30 shadow-sm"
            >
              デモを見る
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-lg">豊富なキャラクター</h3>
              <p className="text-white/90 drop-shadow">
                ドラゴン、エルフ、アンドロイドなど6つの種族から選択。
                それぞれ独特の個性と能力を持っています。
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-lg">自然な会話</h3>
              <p className="text-white/90 drop-shadow">
                Claude AIによる高度な自然言語処理で、
                まるで人間のような自然な対話を実現。
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-lg">24時間対応</h3>
              <p className="text-white/90 drop-shadow">
                営業、マーケティング、分析など専門分野に特化した
                AI社員が24時間あなたをサポート。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/20 backdrop-blur-md text-white py-12 mt-20 border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/nemuranai-ai_logo.png" 
              alt="AI社員は眠らない ロゴ" 
              className="h-8 w-auto drop-shadow-lg brightness-0 invert"
            />
          </div>
          <p className="text-white/70 drop-shadow">
            Powered by Claude AI & Next.js
          </p>
        </div>
      </footer>
    </div>
  )
}