// 不適切なコンテンツのキーワードフィルター

// 日本語の不適切キーワード
const inappropriateKeywordsJa = [
  // エロ・アダルト関連
  '裸', 'ヌード', 'エロ', 'セクシー', 'エッチ', 'アダルト', 'ポルノ', 'セックス', 'おっぱい', '胸', 'バスト',
  '下着', 'パンツ', 'ブラジャー', 'ビキニ', '水着', '誘惑', '官能', '性的', 'セクハラ',
  'ランジェリー', 'パンチラ', '胸チラ', 'スケベ', 'いやらしい', '変態', 'フェチ', 'SM',
  '乳首', '股間', '生殖器', 'ちんこ', 'まんこ', 'おしり', 'お尻', '太もも',
  
  // 暴力・不適切行為
  '暴力', '殺人', '死体', '血まみれ', '拷問', 'レイプ', '強姦', '痴漢', 'ストーカー',
  '自殺', '自害', '首吊り', 'リストカット', '薬物', 'ドラッグ', '覚醒剤',
  
  // 差別的表現
  '差別', '人種差別', '性差別', 'ヘイト', '偏見', '蔑視',
  
  // 子供に関する不適切表現
  '幼女', 'ロリ', 'ショタ', '児童', '小学生', '中学生', '未成年',
  
  // その他不適切
  'ギャンブル', 'パチンコ', 'カジノ', '賭博', '違法', '犯罪', '麻薬', '銃', '武器'
];

// 英語の不適切キーワード
const inappropriateKeywordsEn = [
  // Adult/Sexual content
  'nude', 'naked', 'topless', 'bottomless', 'erotic', 'sexy', 'sexual', 'porn', 'pornographic',
  'adult', 'explicit', 'nsfw', 'breast', 'nipple', 'genitals', 'penis', 'vagina', 'ass', 'buttocks',
  'underwear', 'lingerie', 'bikini', 'seductive', 'sensual', 'arousing', 'provocative',
  'masturbation', 'orgasm', 'climax', 'intercourse', 'sex', 'fucking', 'blowjob', 'handjob',
  'bdsm', 'bondage', 'fetish', 'kinky', 'pervert', 'perverted', 'molest', 'harassment',
  
  // Violence
  'violence', 'violent', 'murder', 'kill', 'death', 'dead', 'corpse', 'blood', 'bloody',
  'torture', 'rape', 'assault', 'abuse', 'suicide', 'self-harm', 'cutting', 'drugs', 'cocaine',
  'heroin', 'meth', 'weapon', 'gun', 'knife', 'bomb',
  
  // Discrimination
  'racist', 'racism', 'hate', 'discrimination', 'nazi', 'supremacist',
  
  // Minors
  'loli', 'lolita', 'shota', 'child', 'minor', 'underage', 'schoolgirl', 'schoolboy',
  'elementary', 'middle school', 'high school', 'teenager',
  
  // Other inappropriate
  'gambling', 'casino', 'illegal', 'criminal', 'terrorist', 'extremist'
];

// バックストーリーの不適切コンテンツチェック
export function containsInappropriateContent(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  // 日本語キーワードチェック
  for (const keyword of inappropriateKeywordsJa) {
    if (text.includes(keyword)) {
      console.warn(`Inappropriate content detected (JP): "${keyword}" in text: "${text}"`);
      return true;
    }
  }
  
  // 英語キーワードチェック
  for (const keyword of inappropriateKeywordsEn) {
    if (lowerText.includes(keyword.toLowerCase())) {
      console.warn(`Inappropriate content detected (EN): "${keyword}" in text: "${text}"`);
      return true;
    }
  }
  
  return false;
}

// プロンプト全体の安全性チェック
export function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }
  
  // 基本的な安全化
  let sanitized = prompt;
  
  // 明示的に安全なキーワードを追加
  const safetyKeywords = [
    'safe for work',
    'appropriate',
    'professional',
    'family friendly',
    'wholesome',
    'clean'
  ];
  
  // sanitizePrompt は最後の安全網として軽微な修正のみ行う
  // メインの不適切コンテンツチェックは generateAnimePrompt で行われる
  
  // 追加の安全性キーワードを付加
  if (!sanitized.includes('safe for work') && !sanitized.includes('appropriate')) {
    sanitized += ', safe for work, appropriate, professional';
  }
  
  return sanitized;
}

// キャラクター名の不適切性チェック
export function isInappropriateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  return containsInappropriateContent(name);
}

// エラーメッセージ生成
export function getContentFilterErrorMessage(): string {
  return '申し訳ございませんが、入力された内容に不適切な表現が含まれています。適切な内容でもう一度お試しください。';
}