// AI社員のランダム名前生成

export const characterNames = [
  '佐藤 光',
  '鈴木 そら',
  '高橋 未来',
  '田中 葵',
  '渡辺 結衣',
  '山本 湊',
  '中村 陽菜',
  '工藤 玲',
  '神谷 凛',
  '迅',
  'こはる',
  'みのり',
  'かいと',
  'ポン太',
  'ルカち',
  'タクミン',
  'ライラ',
  'オリオン',
  'ゼファー',
  'エルリア',
  'ドレイヴン',
  'ネオリカ',
  'クロネ',
  'ソラリ',
  'ユグリカ',
  'マックス',
  'VERA-01',
  'NEON-X',
  'MIKA-7'
];

// ランダムな名前を取得する関数
export function getRandomCharacterName(): string {
  const randomIndex = Math.floor(Math.random() * characterNames.length);
  return characterNames[randomIndex];
}

// 指定した名前以外のランダムな名前を取得する関数（連続で同じ名前を避ける）
export function getRandomCharacterNameExcluding(excludeName: string): string {
  const availableNames = characterNames.filter(name => name !== excludeName);
  if (availableNames.length === 0) {
    return getRandomCharacterName();
  }
  
  const randomIndex = Math.floor(Math.random() * availableNames.length);
  return availableNames[randomIndex];
}