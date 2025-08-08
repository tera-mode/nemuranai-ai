'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CharacterCustomizer } from '@/components/CharacterCustomizer';
import { CharacterPreview } from '@/components/CharacterPreview';
import { createCharacter } from '@/lib/character-actions';
import { CharacterRace, PersonalityType, BusinessDomain } from '@/types/database';

export default function CreateCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [characterData, setCharacterData] = useState({
    name: '',
    race: 'dragon' as CharacterRace,
    personality: 'tsundere' as PersonalityType,
    domain: 'sales' as BusinessDomain,
    appearance: {
      hairColor: '#8B4513',
      eyeColor: '#4A5568',
      outfit: 'business',
      accessories: []
    },
    backstory: ''
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleCreateCharacter = async () => {
    const userId = session?.user?.id || session?.user?.email;
    
    if (!userId || !characterData.name.trim()) {
      alert('名前を入力してください');
      return;
    }

    setIsCreating(true);
    try {
      await createCharacter({
        ...characterData,
        userId
      });
      
      alert('AI社員が誕生しました！🎉');
      router.push('/dashboard');
    } catch (error) {
      alert('エラーが発生しました。もう一度お試しください。');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AI社員を作成しよう！✨
          </h1>
          <p className="text-white/80">
            あなただけの特別なAI社員をカスタマイズしましょう
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* キャラクターカスタマイザー */}
          <CharacterCustomizer
            characterData={characterData}
            onUpdate={setCharacterData}
          />
          
          {/* プレビュー */}
          <CharacterPreview character={characterData} />
        </div>
        
        <div className="text-center mt-8">
          <button
            onClick={handleCreateCharacter}
            disabled={isCreating || !characterData.name.trim()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isCreating ? '作成中...' : 'AI社員を誕生させる！✨'}
          </button>
          
          <div className="mt-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/80 hover:text-white underline"
            >
              ← ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}