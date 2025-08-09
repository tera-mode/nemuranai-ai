import { CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';

export const getRaceLabel = (race: CharacterRace): string => {
  const raceLabels: Record<CharacterRace, string> = {
    human: '人間',
    dragon: 'ドラゴン',
    elf: 'エルフ',
    android: 'アンドロイド',
    ghost: 'ゴースト',
    mage: '魔法使い',
    dog: '犬族',
    cat: '猫族',
    knight: '騎士',
    ninja: '忍者'
  };
  return raceLabels[race] || race;
};

export const getGenderLabel = (gender: CharacterGender): string => {
  const genderLabels: Record<CharacterGender, string> = {
    male: '男性',
    female: '女性',
    'non-binary': 'ノンバイナリー'
  };
  return genderLabels[gender] || gender;
};

export const getAgeLabel = (age: CharacterAge): string => {
  const ageLabels: Record<CharacterAge, string> = {
    young: '若年',
    adult: '壮年',
    elder: '老年'
  };
  return ageLabels[age] || age;
};

export const getSkinToneLabel = (skinTone: SkinTone): string => {
  const skinToneLabels: Record<SkinTone, string> = {
    pinkish: '薄桃色',
    fair: '薄色',
    light: '明色',
    medium: '中色',
    olive: 'オリーブ',
    brown: '褐色',
    dark: '濃色',
    deep: '深色'
  };
  return skinToneLabels[skinTone] || skinTone;
};

export const getPersonalityLabel = (personality: PersonalityType): string => {
  const personalityLabels: Record<PersonalityType, string> = {
    tsundere: 'ツンデレ',
    kuudere: 'クール',
    genki: '元気っ子',
    yandere: 'ヤンデレ',
    oneesan: 'ミステリアス',
    imouto: '素直',
    landmine: '地雷系',
    wild: 'ワイルド'
  };
  return personalityLabels[personality] || personality;
};

export const getDomainLabel = (domain: BusinessDomain): string => {
  const domainLabels: Record<BusinessDomain, string> = {
    sales: '営業・セールス',
    marketing: 'マーケティング',
    support: 'カスタマーサポート',
    analysis: 'データ分析',
    secretary: '秘書・アシスタント',
    strategy: '戦略・企画',
    designer: 'デザイナー',
    writer: 'ライター'
  };
  return domainLabels[domain] || domain;
};

// テーマカラーの選択肢
export const getThemeColorOptions = () => [
  { value: '#ff6b6b', label: '情熱の赤', preview: 'bg-red-500' },
  { value: '#4ecdc4', label: '爽やかな青緑', preview: 'bg-teal-500' },
  { value: '#45b7d1', label: '清涼な青', preview: 'bg-blue-500' },
  { value: '#96ceb4', label: '自然の緑', preview: 'bg-green-400' },
  { value: '#feca57', label: '温かい黄', preview: 'bg-yellow-400' },
  { value: '#ff9ff3', label: '可愛いピンク', preview: 'bg-pink-400' },
  { value: '#a29bfe', label: '神秘の紫', preview: 'bg-purple-400' },
  { value: '#fd79a8', label: '華やかなマゼンタ', preview: 'bg-rose-400' },
  { value: '#fdcb6e', label: '輝くオレンジ', preview: 'bg-orange-400' },
  { value: '#6c5ce7', label: '深い紫', preview: 'bg-indigo-500' }
];