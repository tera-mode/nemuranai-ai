import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AICharacter } from '@/types/database';

// キャラクター情報からアニメ調プロンプトを生成
export function generateAnimePrompt(character: Partial<AICharacter>): string {
  // 種族の特徴を定義
  const raceFeatures: Record<string, string> = {
    dragon: 'dragon-like features, small horns, dragon ears, mystical scales accents',
    elf: 'pointed elf ears, ethereal beauty, graceful features',
    android: 'subtle cybernetic elements, glowing eyes, futuristic details',
    ghost: 'translucent ethereal appearance, floating, mysterious aura',
    mage: 'magical aura, mystical accessories, wizard-like appearance',
    genius: 'intellectual appearance, glasses, scholarly look'
  };

  // 性格による表情・雰囲気
  const personalityMoods: Record<string, string> = {
    tsundere: 'slightly blushing, proud expression, arms crossed',
    kuudere: 'calm, cool expression, distant gaze, composed',
    genki: 'bright smile, energetic pose, cheerful expression',
    yandere: 'sweet smile with mysterious eyes, intense gaze',
    oneesan: 'mature, gentle smile, caring expression, elegant pose',
    imouto: 'cute, innocent expression, shy smile, adorable'
  };

  // 専門分野による服装・アクセサリー
  const domainOutfits: Record<string, string> = {
    sales: 'business suit, professional attire, confident pose',
    marketing: 'stylish business casual, modern accessories, creative flair',
    support: 'friendly uniform, helping gesture, approachable appearance',
    analysis: 'lab coat or smart casual, analytical tools, focused expression',
    secretary: 'professional office attire, organized appearance, polite stance',
    strategy: 'executive business wear, strategic pose, leadership aura'
  };

  // プロンプトを構築
  const basePrompt = `anime style, high quality, detailed illustration, 1girl, solo, portrait, upper body, 
    beautiful detailed face, ${character.appearance?.hairColor || 'brown'} hair, 
    ${character.appearance?.eyeColor || 'brown'} eyes`;

  const raceFeature = raceFeatures[character.race || 'dragon'] || '';
  const personalityMood = personalityMoods[character.personality || 'tsundere'] || '';
  const domainOutfit = domainOutfits[character.domain || 'sales'] || '';

  const negativePrompt = `lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, 
    fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, 
    watermark, username, blurry, multiple girls, realistic, 3d`;

  return `${basePrompt}, ${raceFeature}, ${personalityMood}, ${domainOutfit}`;
}

// Stability AI APIで画像生成
export async function generateCharacterImage(
  character: Partial<AICharacter>,
  userId: string,
  characterId?: string
): Promise<string> {
  try {
    const prompt = generateAnimePrompt(character);
    
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
    return data.imageUrl;
  } catch (error) {
    console.error('画像生成エラー:', error);
    throw new Error('画像の生成に失敗しました。');
  }
}

// 生成画像をFirebase Storageに保存
export async function saveGeneratedImageToStorage(
  imageBuffer: Buffer,
  userId: string,
  characterId: string
): Promise<string> {
  try {
    // 手動アップロードと同じパス構造を使用
    const timestamp = Date.now();
    const fileName = `generated-character-${characterId}-${timestamp}.png`;
    const filePath = `users/${userId}/characters/${characterId}/${fileName}`;
    
    console.log('Saving image to path:', filePath);
    console.log('Image buffer size:', imageBuffer.length);
    
    const storageRef = ref(storage, filePath);
    
    // シンプルなメタデータに変更
    const metadata = {
      contentType: 'image/png'
    };
    
    console.log('Starting upload...');
    const snapshot = await uploadBytes(storageRef, imageBuffer, metadata);
    console.log('Upload completed, getting download URL...');
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('生成画像保存エラー:', error);
    
    // より詳細なエラー情報をログ出力
    if (error.customData) {
      console.error('Custom data:', error.customData);
    }
    if (error.status_) {
      console.error('Status:', error.status_);
    }
    if (error._baseMessage) {
      console.error('Base message:', error._baseMessage);
    }
    
    throw new Error(`生成画像の保存に失敗しました: ${error.message || 'Unknown error'}`);
  }
}