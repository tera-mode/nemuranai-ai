'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CharacterCustomizer } from '@/components/CharacterCustomizer';
import { CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';

export default function CreateCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [characterData, setCharacterData] = useState({
    name: '',
    gender: 'female' as CharacterGender,
    race: 'human' as CharacterRace,
    age: 'young' as CharacterAge,
    skinTone: 'medium' as SkinTone,
    personality: 'genki' as PersonalityType,
    domain: 'secretary' as BusinessDomain,
    appearance: {
      themeColor: '#4ecdc4',
      outfit: 'business',
      accessories: []
    },
    backstory: ''
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleGenerateImage = async () => {
    if (!characterData.name.trim()) {
      alert('キャラクター名を入力してください');
      return;
    }

    if (!characterData.gender || !characterData.race || !characterData.age || 
        !characterData.skinTone || !characterData.personality || !characterData.domain) {
      alert('すべての項目を選択してください');
      return;
    }

    setIsGenerating(true);
    
    // URLパラメータを作成
    const params = new URLSearchParams({
      name: characterData.name,
      gender: characterData.gender,
      race: characterData.race,
      age: characterData.age,
      skinTone: characterData.skinTone,
      personality: characterData.personality,
      domain: characterData.domain,
      themeColor: characterData.appearance.themeColor,
      backstory: characterData.backstory
    });

    // プレビューページに遷移
    router.push(`/character-preview?${params.toString()}`);
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景画像 */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg001.jpg)' }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      
      {/* コンテンツ */}
      <div className="relative z-10 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              AI社員を作成しよう！✨
            </h1>
            <p className="text-white/90">
              あなただけの特別なAI社員をカスタマイズしましょう
            </p>
          </div>
          
          {/* キャラクターカスタマイザー */}
          <CharacterCustomizer
            characterData={characterData}
            onUpdate={setCharacterData}
          />
          
          {/* 作成ボタン */}
          <div className="text-center mt-8 space-y-4">
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  生成中...
                </span>
              ) : (
                '🎨 この内容でキャラクター画像をAI生成'
              )}
            </button>
            
            <div>
              <button
                onClick={() => router.push('/home')}
                className="text-white/80 hover:text-white underline"
                disabled={isGenerating}
              >
                ← ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}