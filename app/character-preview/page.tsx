'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createCharacter } from '@/lib/character-actions';
import { generateCharacterImage } from '@/lib/image-generation';
import { CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';
import { getRaceLabel, getGenderLabel, getAgeLabel, getSkinToneLabel, getPersonalityLabel, getDomainLabel, getThemeColorOptions } from '@/lib/translations';

function CharacterPreviewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [characterComment, setCharacterComment] = useState<string>('');
  const [characterData, setCharacterData] = useState<any>(null);
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false);
  const generationInProgress = useRef(false);

  const generateImage = useCallback(async (data: any) => {
    if (!session?.user || hasGeneratedImage || generationInProgress.current) {
      console.log('Skipping image generation:', {
        hasUser: !!session?.user,
        hasGenerated: hasGeneratedImage,
        inProgress: generationInProgress.current
      });
      return;
    }
    
    generationInProgress.current = true; // 生成開始をマーク
    setIsLoading(true);
    setHasGeneratedImage(true); // フラグを立てて重複を防ぐ
    
    try {
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      console.log('Starting image generation for character:', data.name);
      const imageUrl = await generateCharacterImage(data, userId);
      setGeneratedImageUrl(imageUrl);
      
      // キャラクターからのコメントを生成
      const comment = generateCharacterComment(data);
      setCharacterComment(comment);
      console.log('Image generation completed successfully');
    } catch (error) {
      console.error('画像生成エラー:', error);
      setCharacterComment('画像の生成に失敗しましたが、キャラクターは作成できます。');
      setHasGeneratedImage(false); // エラー時はフラグをリセットして再試行可能にする
    } finally {
      setIsLoading(false);
      generationInProgress.current = false; // 生成終了をマーク
    }
  }, [session?.user, hasGeneratedImage]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'loading') return; // セッション読み込み中は何もしない

    // URLパラメータからキャラクターデータを取得
    const name = searchParams.get('name');
    const gender = searchParams.get('gender') as CharacterGender;
    const race = searchParams.get('race') as CharacterRace;
    const age = searchParams.get('age') as CharacterAge;
    const skinTone = searchParams.get('skinTone') as SkinTone;
    const personality = searchParams.get('personality') as PersonalityType;
    const domain = searchParams.get('domain') as BusinessDomain;
    const themeColor = searchParams.get('themeColor');
    const backstory = searchParams.get('backstory');

    if (!name || !gender || !race || !age || !skinTone || !personality || !domain || !themeColor) {
      router.push('/create-character');
      return;
    }

    const data = {
      name,
      gender,
      race,
      age,
      skinTone,
      personality,
      domain,
      appearance: {
        themeColor,
        outfit: 'business',
        accessories: []
      },
      backstory: backstory || ''
    };

    setCharacterData(data);
    
    // 画像生成は一度だけ実行
    if (!hasGeneratedImage && !generationInProgress.current && session?.user) {
      console.log('Triggering image generation from useEffect');
      generateImage(data);
    }
  }, [searchParams, status, router, generateImage, session?.user, hasGeneratedImage]);

  const generateCharacterComment = (data: any): string => {
    const comments = {
      tsundere: [
        "べ、別にあなたのために生まれたわけじゃないんだからね！",
        "私の力を見くびらないでよ！でも...よろしくお願いします。",
        "ふ、ふん！私がいれば仕事なんて楽勝よ！"
      ],
      kuudere: [
        "...私があなたのAI社員になりました。期待に応えるよう努力します。",
        "感情的になることはありませんが、最善を尽くします。",
        "効率を重視します。無駄な時間は使いません。"
      ],
      genki: [
        "わぁ！新しい仲間ですね！一緒に頑張りましょう〜♪",
        "元気いっぱいでお仕事させていただきます！",
        "今日から私があなたの頼れるパートナーです！"
      ],
      yandere: [
        "あなたのため...だけに生まれてきました♡",
        "私以外のAI社員は必要ありませんよね？",
        "あなたのお仕事、私が全部やってあげます..."
      ],
      oneesan: [
        "あら、可愛い部下ができましたね♪お姉さんに任せなさい。",
        "心配しないで、私がしっかりサポートしてあげるから。",
        "困ったことがあったら、いつでも頼ってくださいね。"
      ],
      imouto: [
        "お兄ちゃん...じゃなくて、お疲れ様です！",
        "私、頑張りますから見守っていてくださいね♪",
        "一緒にお仕事できて嬉しいです〜！"
      ],
      landmine: [
        "私のこと...どう思ってるの？",
        "他の子より私の方がいいよね？ね？",
        "私だけを見ていてくれる...よね？"
      ],
      wild: [
        "よろしく！ガンガン行くぜ！",
        "遠慮なんていらないさ！一緒に暴れようぜ！",
        "型にはまったやり方なんてクソ食らえだ！"
      ]
    };

    const personalityComments = comments[data.personality] || ["よろしくお願いします！"];
    return personalityComments[Math.floor(Math.random() * personalityComments.length)];
  };

  const handleCreateCharacter = async () => {
    if (!session?.user || !characterData) return;

    setIsCreating(true);
    try {
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      await createCharacter({
        ...characterData,
        userId,
        profileImageUrl: generatedImageUrl || undefined
      });

      router.push('/home?refresh=true');
    } catch (error) {
      console.error('キャラクター作成エラー:', error);
      alert('キャラクターの作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsCreating(false);
    }
  };

  if (status === 'loading' || isLoading || !characterData) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-2xl drop-shadow-lg mb-2">AI画像生成中...</div>
          <div className="text-white/80 text-sm">キャラクターの魅力的な画像を作成しています</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const themeColorOptions = getThemeColorOptions();
  const selectedColor = themeColorOptions.find(c => c.value === characterData.appearance.themeColor);

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
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              🎨 AI社員が誕生しました！
            </h1>
            <p className="text-white/90">
              生成された画像とプロフィールを確認してください
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 画像プレビュー */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg text-center">
                プロフィール画像
              </h2>
              
              <div className="aspect-square rounded-2xl overflow-hidden bg-white/10 mb-4">
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt={characterData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p>画像生成中...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* キャラクターからのコメント */}
              <div className="bg-white/20 rounded-xl p-4 border border-white/30">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💬</div>
                  <div>
                    <p className="text-white font-medium text-sm mb-1">
                      {characterData.name}より
                    </p>
                    <p className="text-white/90 text-sm italic">
                      「{characterComment}」
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* キャラクター情報 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg text-center">
                プロフィール詳細
              </h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/70 text-xs">名前</p>
                    <p className="text-white font-medium">{characterData.name}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">性別</p>
                    <p className="text-white font-medium">{getGenderLabel(characterData.gender)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/70 text-xs">種族</p>
                    <p className="text-white font-medium">{getRaceLabel(characterData.race)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">年齢層</p>
                    <p className="text-white font-medium">{getAgeLabel(characterData.age)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/70 text-xs">肌の色</p>
                    <p className="text-white font-medium">{getSkinToneLabel(characterData.skinTone)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">テーマカラー</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: characterData.appearance.themeColor }}
                      />
                      <p className="text-white font-medium text-sm">{selectedColor?.label}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/70 text-xs">性格</p>
                    <p className="text-white font-medium">{getPersonalityLabel(characterData.personality)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">専門分野</p>
                    <p className="text-white font-medium">{getDomainLabel(characterData.domain)}</p>
                  </div>
                </div>

                {characterData.backstory && (
                  <div>
                    <p className="text-white/70 text-xs mb-1">バックストーリー</p>
                    <p className="text-white/90 text-sm bg-white/10 rounded-lg p-3">
                      {characterData.backstory}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="text-center mt-8 space-y-4">
            <button
              onClick={handleCreateCharacter}
              disabled={isCreating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  AI社員を登録中...
                </span>
              ) : (
                '✨ この内容でAI社員を作成する'
              )}
            </button>

            <div>
              <button
                onClick={() => router.push('/create-character')}
                className="text-white/80 hover:text-white underline"
                disabled={isCreating}
              >
                ← 設定を変更する
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CharacterPreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-2xl drop-shadow-lg mb-2">読み込み中...</div>
        </div>
      </div>
    }>
      <CharacterPreviewContent />
    </Suspense>
  );
}