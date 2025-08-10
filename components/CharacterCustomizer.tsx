'use client';

import { CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';
import { getRaceLabel, getGenderLabel, getAgeLabel, getSkinToneLabel, getPersonalityLabel, getDomainLabel, getThemeColorOptions } from '@/lib/translations';
import { getRandomCharacterNameExcluding } from '@/lib/random-names';

interface CharacterData {
  name: string;
  gender: CharacterGender;
  race: CharacterRace;
  age: CharacterAge;
  skinTone: SkinTone;
  personality: PersonalityType;
  domain: BusinessDomain;
  appearance: {
    themeColor: string;
    outfit: string;
    accessories: string[];
  };
  backstory: string;
}

interface CharacterCustomizerProps {
  characterData: CharacterData;
  onUpdate: (data: CharacterData) => void;
}

export function CharacterCustomizer({ characterData, onUpdate }: CharacterCustomizerProps) {
  const themeColorOptions = getThemeColorOptions();

  const updateData = (field: keyof CharacterData, value: any) => {
    onUpdate({
      ...characterData,
      [field]: value
    });
  };

  const updateAppearance = (field: keyof CharacterData['appearance'], value: any) => {
    onUpdate({
      ...characterData,
      appearance: {
        ...characterData.appearance,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">基本情報</h2>
        
        <div className="space-y-4">
          {/* 名前 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">名前</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={characterData.name}
                onChange={(e) => updateData('name', e.target.value)}
                className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:border-purple-400 focus:outline-none"
                placeholder="AI社員の名前"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const randomName = getRandomCharacterNameExcluding(characterData.name);
                  updateData('name', randomName);
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:scale-105 transition-transform whitespace-nowrap"
                title="ランダムな名前を生成"
              >
                🎲 ランダム
              </button>
            </div>
            <p className="text-white/60 text-xs mt-1">
              💡 ランダムボタンでおすすめの名前を自動生成できます
            </p>
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">性別</label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'non-binary'] as CharacterGender[]).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => updateData('gender', gender)}
                  className={`p-3 rounded-lg text-sm transition-colors ${
                    characterData.gender === gender
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  {getGenderLabel(gender)}
                </button>
              ))}
            </div>
          </div>

          {/* タイプ */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-3">タイプ</label>
            <div className="grid grid-cols-2 gap-3">
              {(['human', 'dragon', 'elf', 'android', 'ghost', 'mage', 'dog', 'cat', 'knight', 'ninja'] as CharacterRace[]).map((race) => {
                const raceEmojis = {
                  human: '👤',
                  dragon: '🐲',
                  elf: '🧝‍♀️',
                  android: '🤖',
                  ghost: '👻',
                  mage: '🧙‍♀️',
                  dog: '🐕',
                  cat: '🐱',
                  knight: '⚔️',
                  ninja: '🥷'
                };
                return (
                  <button
                    key={race}
                    type="button"
                    onClick={() => updateData('race', race)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      characterData.race === race
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-white/30 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <span className="text-2xl">{raceEmojis[race]}</span>
                    <span className="text-white font-medium">{getRaceLabel(race)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 年齢層 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">年齢層</label>
            <div className="grid grid-cols-3 gap-2">
              {(['young', 'adult', 'elder'] as CharacterAge[]).map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => updateData('age', age)}
                  className={`p-3 rounded-lg text-sm transition-colors ${
                    characterData.age === age
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
                >
                  {getAgeLabel(age)}
                </button>
              ))}
            </div>
          </div>

          {/* 肌の色 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-3">肌の色</label>
            <div className="grid grid-cols-4 gap-3">
              {(['pinkish', 'fair', 'light', 'medium', 'olive', 'brown', 'dark', 'deep'] as SkinTone[]).map((skinTone) => {
                const skinColors = {
                  pinkish: '#fdbcb4',
                  fair: '#edb98a',
                  light: '#fd9841',
                  medium: '#e4a373',
                  olive: '#c2b280',
                  brown: '#8d5524',
                  dark: '#5c3317',
                  deep: '#3e2723'
                };
                return (
                  <button
                    key={skinTone}
                    type="button"
                    onClick={() => updateData('skinTone', skinTone)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      characterData.skinTone === skinTone
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-white/30 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white/30"
                      style={{ backgroundColor: skinColors[skinTone] }}
                    />
                    <span className="text-white text-xs font-medium">{getSkinToneLabel(skinTone)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 性格と専門分野 */}
      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">性格・専門分野</h2>
        
        <div className="space-y-4">
          {/* 性格 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-3">性格</label>
            <div className="grid grid-cols-2 gap-3">
              {(['tsundere', 'kuudere', 'genki', 'yandere', 'oneesan', 'imouto', 'landmine', 'wild'] as PersonalityType[]).map((personality) => {
                const personalityEmojis = {
                  tsundere: '😤',
                  kuudere: '😎',
                  genki: '😊',
                  yandere: '😍',
                  oneesan: '🔮',
                  imouto: '🙂',
                  landmine: '🥺',
                  wild: '🤪'
                };
                return (
                  <button
                    key={personality}
                    type="button"
                    onClick={() => updateData('personality', personality)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      characterData.personality === personality
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-white/30 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <span className="text-xl">{personalityEmojis[personality]}</span>
                    <span className="text-white font-medium">{getPersonalityLabel(personality)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 専門分野 */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-3">専門分野</label>
            <div className="grid grid-cols-2 gap-3">
              {(['sales', 'marketing', 'support', 'analysis', 'secretary', 'strategy', 'designer', 'writer', 'fortune-teller', 'trainer', 'health-enthusiast', 'legal-expert'] as BusinessDomain[]).map((domain) => {
                const domainEmojis = {
                  sales: '💼',
                  marketing: '📱',
                  support: '🛡️',
                  analysis: '📊',
                  secretary: '📋',
                  strategy: '🎯',
                  designer: '🎨',
                  writer: '✍️',
                  'fortune-teller': '🔮',
                  trainer: '💪',
                  'health-enthusiast': '🌱',
                  'legal-expert': '⚖️'
                };
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => updateData('domain', domain)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      characterData.domain === domain
                        ? 'border-purple-400 bg-purple-500/20'
                        : 'border-white/30 bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    <span className="text-xl">{domainEmojis[domain]}</span>
                    <span className="text-white font-medium">{getDomainLabel(domain)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 外見設定 */}
      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">外見設定</h2>
        
        <div className="space-y-4">
          {/* テーマカラー */}
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">テーマカラー</label>
            <div className="grid grid-cols-5 gap-2">
              {themeColorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => updateAppearance('themeColor', color.value)}
                  className={`p-2 rounded-lg text-xs transition-all flex items-center justify-center ${
                    characterData.appearance.themeColor === color.value
                      ? 'ring-2 ring-white scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color.value }} />
                </button>
              ))}
            </div>
            <p className="text-white/60 text-xs mt-2">
              選択したカラー: {themeColorOptions.find(c => c.value === characterData.appearance.themeColor)?.label || '未選択'}
            </p>
          </div>
        </div>
      </div>

      {/* 詳細設定 */}
      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">バックストーリー</h2>
        
        <textarea
          value={characterData.backstory}
          onChange={(e) => updateData('backstory', e.target.value)}
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:border-purple-400 focus:outline-none resize-none"
          rows={4}
          placeholder="キャラクターの詳細な背景や設定を入力してください（画像生成に反映されます）"
        />
      </div>
    </div>
  );
}