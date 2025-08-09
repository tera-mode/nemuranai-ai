'use client';

import { useState } from 'react';
import { AICharacter } from '@/types/database';
import { getDomainLabel, getPersonalityLabel, getRaceLabel } from '@/lib/translations';

interface CharacterCarouselProps {
  characters: AICharacter[];
  onCharacterSelect: (character: AICharacter) => void;
  onCreateCharacter: () => void;
}

export function CharacterCarousel({ characters, onCharacterSelect, onCreateCharacter }: CharacterCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // キャラクター + 追加ボタンのアイテム配列
  const items: (AICharacter | { id: string; type: 'add' })[] = [...characters, { id: 'add', type: 'add' as const }];
  
  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (characters.length === 0) {
    // キャラクターがいない場合は作成ボタンのみ
    return (
      <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden h-48 flex items-center justify-center">
        <button
          onClick={onCreateCharacter}
          className="flex flex-col items-center gap-3 p-8 hover:bg-white/10 rounded-xl transition-colors"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl">
            +
          </div>
          <div className="text-white font-medium">最初のAI社員を作成</div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-0">
      {/* カルーセル本体 */}
      <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden h-72 relative">
        <div 
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="min-w-full h-full relative">
              {'type' in item && item.type === 'add' ? (
                // 追加ボタン
                <button
                  onClick={onCreateCharacter}
                  className="w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-3xl text-white">
                    +
                  </div>
                  <div className="text-white font-medium">新しいAI社員を作成</div>
                </button>
              ) : (
                // キャラクターカード
                <button
                  onClick={() => onCharacterSelect(item as AICharacter)}
                  className="w-full h-full relative group overflow-hidden"
                >
                  {/* キャラクター背景画像 */}
                  {(item as AICharacter).profileImageUrl && (
                    <>
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${(item as AICharacter).profileImageUrl})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    </>
                  )}
                  
                  {/* コンテンツ */}
                  <div className="relative z-10 h-full flex flex-col justify-end p-6">
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
                        {(item as AICharacter).name}
                      </h3>
                      <p className="text-white/90 text-sm drop-shadow">
                        専門分野: {getDomainLabel((item as AICharacter).domain)}
                      </p>
                      <p className="text-white/80 text-xs mt-1 drop-shadow">
                        {getPersonalityLabel((item as AICharacter).personality)} • {getRaceLabel((item as AICharacter).race)}
                      </p>
                    </div>
                  </div>
                  
                  {/* ホバーエフェクト */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ナビゲーションボタン */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10 shadow-lg border border-white/20"
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10 shadow-lg border border-white/20"
          >
            →
          </button>
        </>
      )}

      {/* インジケーター */}
      {items.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}