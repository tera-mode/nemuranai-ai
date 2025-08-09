import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AICharacter, CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';

// 種族ごとの特徴を定義
const raceFeatures: Record<CharacterRace, string> = {
  human: 'human, natural appearance',
  dragon: 'dragon horns, dragon wings, dragon tail, scales, fantasy creature, majestic',
  elf: 'pointed ears, elegant features, mystical aura, graceful',
  android: 'mechanical parts, glowing circuit patterns, futuristic elements, cybernetic',
  ghost: 'translucent appearance, ethereal glow, floating, spiritual',
  mage: 'wizard hat, magic staff, mystical robes, magical aura',
  dog: 'dog ears, dog tail, canine features, loyal expression',
  cat: 'cat ears, cat tail, feline features, graceful movement',
  knight: 'knight armor, medieval plate armor, sword, shield, noble appearance, chivalrous',
  ninja: 'ninja outfit, dark clothing, mask, stealthy appearance, martial arts pose'
};

// 性別ごとの特徴
const genderFeatures: Record<CharacterGender, string> = {
  male: 'masculine features, strong jawline',
  female: 'feminine features, graceful appearance',
  'non-binary': 'androgynous features, neutral appearance'
};

// 年齢層ごとの特徴
const ageFeatures: Record<CharacterAge, string> = {
  young: 'youthful face, teenage appearance, bright innocent eyes, energetic posture, smooth skin',
  adult: 'mature face, adult features, confident expression, professional demeanor, well-defined facial structure',
  elder: 'elderly appearance, wise mature face, experienced expression, dignified posture, aged features, wrinkles'
};

// 肌色の表現
const skinToneFeatures: Record<SkinTone, string> = {
  pinkish: 'pinkish pale skin, soft rosy complexion',
  fair: 'fair light skin, peachy complexion',
  light: 'light tan skin, warm beige complexion',
  medium: 'medium brown skin, golden complexion',
  olive: 'olive toned skin, mediterranean complexion',
  brown: 'rich brown skin, mocha complexion',
  dark: 'dark brown skin, chocolate complexion',
  deep: 'very dark skin, ebony complexion'
};

// 性格ごとの表情・雰囲気・動作
const personalityMoods: Record<PersonalityType, string> = {
  tsundere: 'blushing, looking away, crossed arms, embarrassed expression, defensive pose, conflicted emotions',
  kuudere: 'cool expression, composed demeanor, confident look, calm gaze, sophisticated posture',
  genki: 'bright smile, energetic pose, cheerful expression, dynamic movement, sparkling eyes',
  yandere: 'obsessive smile, intense gaze, possessive aura, slightly unhinged expression',
  oneesan: 'mysterious smile, enigmatic expression, alluring posture, mystical aura',
  imouto: 'honest expression, straightforward look, genuine smile, sincere posture',
  landmine: 'unstable expression, emotional complexity, fragile appearance, intense emotions',
  wild: 'fierce expression, dynamic pose, untamed energy, rebellious attitude'
};

// 専門分野ごとの衣装・アイテム・環境
const domainOutfits: Record<BusinessDomain, string> = {
  sales: 'business suit, briefcase, professional attire, confident handshake pose, office environment',
  marketing: 'trendy outfit, tablet, creative accessories, presentation materials, modern workspace',
  support: 'headset, helpful expression, service uniform, customer-friendly pose',
  analysis: 'glasses, charts in background, data visualization, analytical tools, focused expression',
  secretary: 'office attire, notepad, organized desk, scheduling tools, efficient posture',
  strategy: 'formal suit, strategic planning pose, whiteboard with diagrams, leadership aura',
  designer: 'creative outfit, design tools, color palette, artistic workspace, inspirational pose',
  writer: 'comfortable writing attire, notebook, pen, bookshelves, contemplative expression'
};

// 背景・環境・ストーリー要素を生成
function generateStoryElements(character: any): string {
  const backstoryElements = character.backstory ? `, ${character.backstory}` : '';
  const themeColorHex = character.appearance?.themeColor || '#4ecdc4';
  
  // 専門分野に応じた環境設定
  const environmentMap: Record<BusinessDomain, string> = {
    sales: 'modern office, glass windows, city view, professional lighting',
    marketing: 'creative studio, colorful environment, digital displays, inspiring atmosphere',
    support: 'help desk environment, multiple monitors, organized workspace',
    analysis: 'data center, multiple screens with graphs, analytical environment',
    secretary: 'executive office, organized desk, professional atmosphere',
    strategy: 'conference room, strategic planning boards, executive environment',
    designer: 'art studio, creative workspace, design materials scattered around',
    writer: 'cozy library, bookshelves, warm lighting, writing desk'
  };

  const environment = environmentMap[character.domain] || 'professional office environment';
  const colorScheme = `color scheme incorporating ${themeColorHex}`;
  
  return `${environment}, ${colorScheme}, dynamic composition, story-driven scene${backstoryElements}`;
}

// 躍動感とキャラクター中心のレイアウト
function generateCompositionPrompt(): string {
  return `centered composition, character as main focus, dynamic pose, engaging expression, 
    portrait orientation suitable for profile picture, face clearly visible in center, 
    upper body focus, professional headshot style, high quality details, 
    cinematic lighting, depth of field background`;
}

// 日本語を英語に翻訳する関数（クライアントサイド用）
async function translateToEnglish(text: string): Promise<string> {
  if (!text || text.trim() === '') return '';
  
  // 既に英語の場合はそのまま返す（簡易的な判定）
  if (!/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
    return text;
  }
  
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translatedText || text;
    
    console.log('🔤 Backstory Translation:', { original: text, translated: translatedText });
    return translatedText;
    
  } catch (error) {
    console.error('❌ Backstory translation failed:', error);
    return text; // フォールバック
  }
}

// 改善されたアニメ風プロンプト生成
export async function generateAnimePrompt(character: any): Promise<string> {
  const raceFeature = raceFeatures[character.race] || raceFeatures.human;
  const genderFeature = genderFeatures[character.gender] || genderFeatures.female;
  const ageFeature = ageFeatures[character.age] || ageFeatures.adult;
  const skinToneFeature = skinToneFeatures[character.skinTone] || skinToneFeatures.medium;
  const personalityMood = personalityMoods[character.personality] || personalityMoods.genki;
  const domainOutfit = domainOutfits[character.domain] || domainOutfits.secretary;
  const storyElements = generateStoryElements(character);
  const composition = generateCompositionPrompt();

  const basePrompt = `anime style, highly detailed, beautiful ${character.name || 'AI assistant'}`;
  
  // バックストーリーを翻訳して前半に強く反映させる
  const translatedBackstory = character.backstory ? await translateToEnglish(character.backstory) : '';
  const backstoryPrefix = translatedBackstory ? `${translatedBackstory}, ` : '';
  
  // 肌色と年齢を最初に強調する
  const primaryFeatures = `${skinToneFeature}, ${ageFeature}, ${genderFeature}`;
  const secondaryFeatures = `${raceFeature}, ${personalityMood}`;
  const characterPersonality = `${domainOutfit}`;
  
  const fullPrompt = `${basePrompt}, ${backstoryPrefix}${primaryFeatures}, ${secondaryFeatures}, ${characterPersonality}, ${storyElements}, ${composition}`;
  
  console.log('Generated prompt (with translated backstory):', fullPrompt);
  console.log('Original backstory:', character.backstory);
  console.log('Translated backstory:', translatedBackstory);
  return fullPrompt;
}

// Stability AI APIで画像生成
export async function generateCharacterImage(
  character: any,
  userId: string,
  characterId?: string
): Promise<string> {
  try {
    const prompt = await generateAnimePrompt(character);
    
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
        characterId: characterId || `temp-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`画像生成エラー: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 開発環境でbase64Fallbackがあれば表示用に使用するが、保存は一時URLを使用
    if (data.base64Fallback && process.env.NODE_ENV === 'development') {
      console.log('Base64 fallback available, but using temp URL for database storage');
      // Base64は画面表示用、実際の保存には一時URLを使用
      return data.imageUrl; // 一時URL（/api/temp-image/xxx）を返す
    }
    
    return data.imageUrl;
  } catch (error) {
    console.error('画像生成エラー:', error);
    throw error;
  }
}

// Firebase Storageに画像を保存
export async function saveGeneratedImageToStorage(
  imageBase64: string, 
  characterId: string
): Promise<string> {
  try {
    // Firebase Storage設定をデバッグ
    console.log('Storage instance:', storage.app.options);
    
    // 手動アップロードと同じパス構造を使用
    const timestamp = Date.now();
    const fileName = `generated-character-${characterId}-${timestamp}.png`;
    const filePath = `character-images/${fileName}`;
    
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('Image buffer size:', imageBuffer.length);
    
    const storageRef = ref(storage, filePath);
    console.log('Storage ref created:', storageRef.bucket, storageRef.fullPath);
    
    // シンプルなメタデータに変更
    const metadata = {
      contentType: 'image/png'
    };
    
    console.log('Starting upload to Firebase Storage...');
    const uploadResult = await uploadBytes(storageRef, imageBuffer, metadata);
    console.log('Upload completed:', uploadResult.metadata.fullPath);
    
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    throw new Error(`画像のアップロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}