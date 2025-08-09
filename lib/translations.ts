// パラメータ翻訳ヘルパー関数

export const getDomainLabel = (domain: string): string => {
  const domainLabels: Record<string, string> = {
    sales: '営業・セールス',
    marketing: 'マーケティング',
    support: 'カスタマーサポート',
    analysis: 'データ分析',
    secretary: '秘書・アシスタント',
    strategy: '戦略・企画'
  };
  return domainLabels[domain] || domain;
};

export const getPersonalityLabel = (personality: string): string => {
  const personalityLabels: Record<string, string> = {
    tsundere: 'ツンデレ',
    kuudere: 'クーデレ',
    genki: '元気っ子',
    yandere: 'ヤンデレ',
    oneesan: 'お姉さんタイプ',
    imouto: '妹タイプ'
  };
  return personalityLabels[personality] || personality;
};

export const getRaceLabel = (race: string): string => {
  const raceLabels: Record<string, string> = {
    dragon: 'ドラゴン',
    elf: 'エルフ',
    android: 'アンドロイド',
    ghost: 'ゴースト',
    mage: 'メイジ',
    genius: '天才少女'
  };
  return raceLabels[race] || race;
};