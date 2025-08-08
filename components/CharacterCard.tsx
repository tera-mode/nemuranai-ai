'use client';

import { AICharacter } from '@/types/database';

interface CharacterCardProps {
  character: AICharacter;
  isSelected: boolean;
  onClick: () => void;
}

export function CharacterCard({ character, isSelected, onClick }: CharacterCardProps) {
  const getRaceEmoji = (race: string) => {
    const raceEmojis: Record<string, string> = {
      dragon: '🐲',
      elf: '🧝‍♀️',
      android: '🤖',
      ghost: '👻',
      mage: '🧙‍♀️',
      genius: '👶'
    };
    return raceEmojis[race] || '👤';
  };

  const getDomainEmoji = (domain: string) => {
    const domainEmojis: Record<string, string> = {
      sales: '💼',
      marketing: '📱',
      support: '🛡️',
      analysis: '📊',
      secretary: '📋',
      strategy: '🎯'
    };
    return domainEmojis[domain] || '💼';
  };

  const getDomainLabel = (domain: string) => {
    const domainLabels: Record<string, string> = {
      sales: '営業',
      marketing: 'マーケティング',
      support: 'サポート',
      analysis: 'データ分析',
      secretary: '秘書',
      strategy: '戦略企画'
    };
    return domainLabels[domain] || domain;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl transition-all duration-200 text-left ${
        isSelected
          ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400 shadow-lg'
          : 'bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/40'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* アバター */}
        <div className="text-3xl">
          {getRaceEmoji(character.race)}
        </div>
        
        {/* キャラクター情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">
              {character.name}
            </h3>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              Lv.{character.level}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <span className="text-base">{getDomainEmoji(character.domain)}</span>
            <span>{getDomainLabel(character.domain)}</span>
          </div>
        </div>

        {/* オンライン状態 */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">オンライン</span>
          </div>
          
          {/* 簡易ステータス */}
          <div className="text-xs text-white/60">
            効率性: {character.stats.efficiency}
          </div>
        </div>
      </div>

      {/* プログレスバー（経験値） */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>経験値</span>
          <span>{character.experience}/1000</span>
        </div>
        <div className="bg-white/20 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-blue-400 to-purple-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min((character.experience / 1000) * 100, 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
}