'use client';

import { CharacterRace, PersonalityType, BusinessDomain } from '@/types/database';

interface CharacterCustomizerProps {
  characterData: any;
  onUpdate: (data: any) => void;
}

export function CharacterCustomizer({ characterData, onUpdate }: CharacterCustomizerProps) {
  const raceOptions = [
    { value: 'dragon', label: '🐲 ドラゴン族', description: '古代の知恵と炎の力を持つ' },
    { value: 'elf', label: '🧝‍♀️ エルフ', description: '魔法と自然の力を操る' },
    { value: 'android', label: '🤖 アンドロイド', description: '高い処理能力と学習機能' },
    { value: 'ghost', label: '👻 地縛霊', description: '人間の心を深く理解する' },
    { value: 'mage', label: '🧙‍♀️ 魔法使い', description: '魔法で効率を極限まで高める' },
    { value: 'genius', label: '👶 天才児', description: 'IQ300の純粋な発想力' }
  ];

  const personalityOptions = [
    { value: 'tsundere', label: 'ツンデレ', description: '素直になれない可愛らしさ' },
    { value: 'kuudere', label: 'クーデレ', description: 'クールだけど実は優しい' },
    { value: 'genki', label: '元気っ子', description: '明るく前向きなエネルギー' },
    { value: 'serious', label: '真面目', description: '責任感が強く信頼できる' },
    { value: 'mysterious', label: 'ミステリアス', description: '謎めいた魅力を持つ' },
    { value: 'innocent', label: '純真', description: '純粋で心優しい性格' }
  ];

  const domainOptions = [
    { value: 'sales', label: '💼 営業', description: '売上を伸ばすプロフェッショナル' },
    { value: 'marketing', label: '📱 マーケティング', description: 'ブランドを輝かせる専門家' },
    { value: 'support', label: '🛡️ サポート', description: 'お客様第一の守護者' },
    { value: 'analysis', label: '📊 データ分析', description: 'データから真実を見抜く' },
    { value: 'secretary', label: '📋 秘書', description: '完璧な段取りのスペシャリスト' },
    { value: 'strategy', label: '🎯 戦略企画', description: '未来を描く戦略家' }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">キャラクター設定</h2>
      
      {/* 名前入力 */}
      <div>
        <label className="block text-white font-medium mb-2">AI社員の名前</label>
        <input
          type="text"
          value={characterData.name}
          onChange={(e) => onUpdate({ ...characterData, name: e.target.value })}
          placeholder="例: ミスティ、ドラゴ、リトルなど"
          className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-purple-400 focus:outline-none"
        />
      </div>

      {/* 種族選択 */}
      <div>
        <label className="block text-white font-medium mb-2">種族</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {raceOptions.map((race) => (
            <button
              key={race.value}
              onClick={() => onUpdate({ ...characterData, race: race.value })}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                characterData.race === race.value
                  ? 'border-purple-400 bg-purple-500/30'
                  : 'border-white/30 bg-white/10 hover:border-purple-300'
              }`}
            >
              <div className="text-white font-medium">{race.label}</div>
              <div className="text-white/70 text-xs">{race.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 性格選択 */}
      <div>
        <label className="block text-white font-medium mb-2">性格</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personalityOptions.map((personality) => (
            <button
              key={personality.value}
              onClick={() => onUpdate({ ...characterData, personality: personality.value })}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                characterData.personality === personality.value
                  ? 'border-pink-400 bg-pink-500/30'
                  : 'border-white/30 bg-white/10 hover:border-pink-300'
              }`}
            >
              <div className="text-white font-medium">{personality.label}</div>
              <div className="text-white/70 text-xs">{personality.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 専門分野選択 */}
      <div>
        <label className="block text-white font-medium mb-2">専門分野</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {domainOptions.map((domain) => (
            <button
              key={domain.value}
              onClick={() => onUpdate({ ...characterData, domain: domain.value })}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                characterData.domain === domain.value
                  ? 'border-blue-400 bg-blue-500/30'
                  : 'border-white/30 bg-white/10 hover:border-blue-300'
              }`}
            >
              <div className="text-white font-medium">{domain.label}</div>
              <div className="text-white/70 text-xs">{domain.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 外見カスタマイズ */}
      <div>
        <label className="block text-white font-medium mb-2">外見設定</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">髪の色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={characterData.appearance.hairColor}
                onChange={(e) => onUpdate({
                  ...characterData,
                  appearance: { ...characterData.appearance, hairColor: e.target.value }
                })}
                className="w-12 h-10 rounded border border-white/30"
              />
              <span className="text-white/60 text-sm">{characterData.appearance.hairColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-1">瞳の色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={characterData.appearance.eyeColor}
                onChange={(e) => onUpdate({
                  ...characterData,
                  appearance: { ...characterData.appearance, eyeColor: e.target.value }
                })}
                className="w-12 h-10 rounded border border-white/30"
              />
              <span className="text-white/60 text-sm">{characterData.appearance.eyeColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* バックストーリー */}
      <div>
        <label className="block text-white font-medium mb-2">バックストーリー</label>
        <textarea
          value={characterData.backstory}
          onChange={(e) => onUpdate({ ...characterData, backstory: e.target.value })}
          placeholder="このAI社員の背景や動機を自由に設定してください..."
          rows={4}
          className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-purple-400 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}