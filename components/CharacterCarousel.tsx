'use client';

import { useState, useRef, useEffect } from 'react';
import { AICharacter } from '@/types/database';
import { getDomainLabel, getPersonalityLabel, getRaceLabel, getGenderLabel, getAgeLabel, getSkinToneLabel } from '@/lib/translations';

interface CharacterCarouselProps {
  characters: AICharacter[];
  onCharacterSelect: (character: AICharacter) => void;
  onCreateCharacter: () => void;
}

export function CharacterCarousel({ characters, onCharacterSelect, onCreateCharacter }: CharacterCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  // スワイプ機能のイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diffX = startX - currentX;
    const threshold = 50; // スワイプ判定の閾値

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // 左にスワイプ → 次へ
        nextSlide();
      } else {
        // 右にスワイプ → 前へ
        prevSlide();
      }
    }
  };

  // マウスでのドラッグ対応
  const handleMouseStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diffX = startX - currentX;
    const threshold = 50;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  if (characters.length === 0) {
    // キャラクターがいない場合は作成ボタンのみ
    return (
      <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden h-80 flex items-center justify-center">
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
      <div 
        ref={carouselRef}
        className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden h-80 relative cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
      >
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
                  onClick={(e) => {
                    // ドラッグ中はクリックを無効化
                    if (Math.abs(startX - currentX) > 10) {
                      e.preventDefault();
                      return;
                    }
                    onCharacterSelect(item as AICharacter);
                  }}
                  className="w-full h-full relative group overflow-hidden"
                >
                  {/* キャラクター背景画像 */}
                  {(item as AICharacter).profileImageUrl && (
                    <>
                      <div 
                        className="absolute inset-0 bg-cover bg-top bg-no-repeat"
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
                      <p className="text-white/90 text-base font-bold drop-shadow mb-1">
                        {getDomainLabel((item as AICharacter).domain)}
                      </p>
                      <p className="text-white/80 text-xs drop-shadow">
                        {getPersonalityLabel((item as AICharacter).personality)} • {getRaceLabel((item as AICharacter).race)}
                        {(item as AICharacter).gender && (item as AICharacter).age && (
                          ` • ${getGenderLabel((item as AICharacter).gender)} • ${getAgeLabel((item as AICharacter).age)}`
                        )}
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
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all duration-300 z-10 shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all duration-300 z-10 shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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