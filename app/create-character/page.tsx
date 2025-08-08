'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CharacterCustomizer } from '@/components/CharacterCustomizer';
import { CharacterPreview } from '@/components/CharacterPreview';
import { ImageUpload } from '@/components/ImageUpload';
import { createCharacter } from '@/lib/character-actions';
import { generateCharacterImage } from '@/lib/image-generation';
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
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  const handleGenerateImage = async () => {
    const userId = session?.user?.id || session?.user?.email;
    if (!userId) return;

    setIsGeneratingImage(true);
    try {
      const generatedImageUrl = await generateCharacterImage(characterData, userId);
      setProfileImageUrl(generatedImageUrl);
      alert('アニメ風プロフィール画像を生成しました！🎨');
    } catch (error) {
      alert('画像生成に失敗しました。もう一度お試しください。');
      console.error('画像生成エラー:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

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
        userId,
        profileImageUrl: profileImageUrl || undefined
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
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* キャラクターカスタマイザー */}
          <div className="lg:col-span-1">
            <CharacterCustomizer
              characterData={characterData}
              onUpdate={setCharacterData}
            />
          </div>
          
          {/* プレビューと画像アップロード */}
          <div className="lg:col-span-1 space-y-6">
            {/* プロフィール画像 */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                プロフィール画像
              </h3>
              <div className="flex justify-center mb-4">
                <ImageUpload
                  userId={session?.user?.id || session?.user?.email || ''}
                  currentImageUrl={profileImageUrl || undefined}
                  onImageUpload={setProfileImageUrl}
                  onImageRemove={() => setProfileImageUrl(null)}
                />
              </div>
              
              {/* AI画像生成ボタン */}
              <div className="text-center">
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !characterData.name.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                >
                  {isGeneratingImage ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      AI画像生成中...
                    </span>
                  ) : (
                    '🎨 AI画像生成'
                  )}
                </button>
                <p className="text-white/60 text-xs mt-2">
                  キャラクター情報からアニメ風画像を自動生成
                </p>
              </div>
            </div>
            
            {/* プレビュー */}
            <CharacterPreview character={characterData} />
          </div>
          
          {/* 右側の説明エリア */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                💡 キャラクター作成のヒント
              </h3>
              <div className="space-y-4 text-white/80 text-sm">
                <div>
                  <h4 className="font-semibold text-white">🎭 性格の選び方</h4>
                  <p>ビジネスシーンでの相談相手として、どんな性格が良いか考えてみましょう。</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">🏢 専門分野</h4>
                  <p>あなたの業務に最も関連する分野を選ぶと、より実用的なアドバイスが得られます。</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">🎨 AI画像生成</h4>
                  <p>キャラクター設定から自動でアニメ風プロフィール画像を生成できます。手動アップロードも可能です。</p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">📝 バックストーリー</h4>
                  <p>キャラクターの背景を設定することで、より一貫性のある会話が楽しめます。</p>
                </div>
              </div>
            </div>
          </div>
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