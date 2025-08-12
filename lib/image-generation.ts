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
  writer: 'comfortable writing attire, notebook, pen, bookshelves, contemplative expression',
  'fortune-teller': 'mystical robes, tarot cards, crystal ball, magical accessories, fortune telling setup',
  trainer: 'athletic wear, fitness equipment, energetic pose, motivational expression, gym environment',
  'health-enthusiast': 'active lifestyle clothing, health supplements, yoga mat, wellness accessories, healthy living vibe',
  'legal-expert': 'formal business attire, law books, legal documents, confident professional pose, office setting',
  analyst: 'business casual attire, multiple monitors, AI orchestration diagrams, workflow charts, strategic analysis pose, tech-forward workspace'
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
    writer: 'cozy library, bookshelves, warm lighting, writing desk',
    'fortune-teller': 'mystical room, candles, crystals, fortune telling table, magical atmosphere',
    trainer: 'modern gym, fitness equipment, motivational posters, energetic lighting',
    'health-enthusiast': 'wellness center, natural lighting, healthy lifestyle elements, zen atmosphere',
    'legal-expert': 'law office, legal library, professional desk, formal business setting'
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

// プロンプト生成の結果型
export interface PromptGenerationResult {
  success: boolean;
  prompt?: string;
  error?: string;
  isFiltered?: boolean;
}

// 改善されたアニメ風プロンプト生成
export async function generateAnimePrompt(character: any): Promise<PromptGenerationResult> {
  // コンテンツフィルタリングをインポート
  const { containsInappropriateContent, sanitizePrompt, isInappropriateName, getContentFilterErrorMessage } = await import('@/lib/content-filter');
  
  // キャラクター名の不適切性チェック
  if (isInappropriateName(character.name)) {
    console.warn('Content filter: Inappropriate character name detected');
    return {
      success: false,
      error: getContentFilterErrorMessage(),
      isFiltered: true
    };
  }
  
  // バックストーリーの不適切性チェック
  if (character.backstory && containsInappropriateContent(character.backstory)) {
    console.warn('Content filter: Inappropriate backstory content detected');
    return {
      success: false,
      error: getContentFilterErrorMessage(),
      isFiltered: true
    };
  }
  
  const raceFeature = raceFeatures[character.race] || raceFeatures.human;
  const genderFeature = genderFeatures[character.gender] || genderFeatures.female;
  const ageFeature = ageFeatures[character.age] || ageFeatures.adult;
  const skinToneFeature = skinToneFeatures[character.skinTone] || skinToneFeatures.medium;
  const personalityMood = personalityMoods[character.personality] || personalityMoods.genki;
  const domainOutfit = domainOutfits[character.domain] || domainOutfits.secretary;
  const storyElements = generateStoryElements(character);
  const composition = generateCompositionPrompt();

  const basePrompt = `anime style, highly detailed, beautiful ${character.name || 'AI assistant'}`;
  
  // バックストーリーを翻訳
  const translatedBackstory = character.backstory ? await translateToEnglish(character.backstory) : '';
  const backstoryElement = translatedBackstory ? `${translatedBackstory}, ` : '';
  
  // プロンプト構成を正常な順序に戻す
  const fullPrompt = `${basePrompt}, ${backstoryElement}${genderFeature}, ${ageFeature}, ${skinToneFeature}, ${raceFeature}, ${personalityMood}, ${domainOutfit}, ${storyElements}, ${composition}`;
  
  // プロンプト全体の安全性チェックと修正
  const sanitizedPrompt = sanitizePrompt(fullPrompt);
  
  console.log('Generated prompt (with translated backstory):', sanitizedPrompt);
  console.log('Original backstory:', character.backstory);
  console.log('Translated backstory:', translatedBackstory);
  
  return {
    success: true,
    prompt: sanitizedPrompt
  };
}

// 画像生成の結果型
export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  isFiltered?: boolean;
}

// Stability AI APIで画像生成
export async function generateCharacterImage(
  character: any,
  userId: string,
  characterId?: string,
  isCharacterCreation: boolean = false
): Promise<ImageGenerationResult> {
  try {
    const promptResult = await generateAnimePrompt(character);
    
    // プロンプト生成でフィルタリングされた場合
    if (!promptResult.success) {
      return {
        success: false,
        error: promptResult.error,
        isFiltered: promptResult.isFiltered
      };
    }
    
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptResult.prompt,
        userId,
        characterId: characterId || `temp-${Date.now()}`,
        isCharacterCreation,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        const errorText = await response.text();
        errorData = { error: errorText };
      }
      
      // 400エラー（スタミナ不足など）の場合
      if (response.status === 400) {
        console.warn('Image generation failed with 400:', errorData);
        
        // スタミナ不足のエラーメッセージをチェック
        if (errorData.error?.includes('スタミナが不足') || errorData.error?.includes('Insufficient stamina')) {
          return {
            success: false,
            error: `${errorData.error || 'スタミナが不足しています'}\n\n💡 スタミナは毎日朝5時に回復するか、プレミアムプランでより多くのスタミナを獲得できます。`
          };
        }
        
        // 召喚契約書不足のエラーメッセージをチェック
        if (errorData.error?.includes('召喚契約書が不足') || errorData.error?.includes('Insufficient summon contracts')) {
          return {
            success: false,
            error: `${errorData.error || '召喚契約書が不足しています'}\n\n💡 召喚契約書はプレミアムプランや個別購入で獲得できます。`
          };
        }
        
        return {
          success: false,
          error: errorData.error || '画像生成リクエストが無効です'
        };
      }
      
      // 403エラーの場合は特別な処理（デッドループ防止）
      if (response.status === 403) {
        console.warn('Image generation blocked by content policy (403)');
        return {
          success: false,
          error: '申し訳ございませんが、このキャラクターの画像生成はコンテンツポリシーにより制限されています。設定を変更してもう一度お試しください。',
          isFiltered: true
        };
      }
      
      // その他のHTTPエラー
      return {
        success: false,
        error: `画像生成サービスエラー (${response.status}): サービスが一時的に利用できません。しばらく待ってからもう一度お試しください。`
      };
    }

    const data = await response.json();
    
    // レスポンスデータの検証
    if (!data.imageUrl) {
      return {
        success: false,
        error: '画像生成は完了しましたが、画像URLの取得に失敗しました。もう一度お試しください。'
      };
    }
    
    console.log('✅ Image generation response:', {
      success: data.success,
      isFirebase: data.isFirebase,
      urlType: data.imageUrl?.startsWith('https://') ? 'Firebase' : 'Other'
    });
    
    return {
      success: true,
      imageUrl: data.imageUrl
    };
  } catch (error: any) {
    console.error('画像生成エラー:', error);
    return {
      success: false,
      error: '画像生成中に予期しないエラーが発生しました。ネットワーク接続を確認して、もう一度お試しください。'
    };
  }
}

// Firebase Storageに画像を保存（Vercel対応版）
export async function saveGeneratedImageToStorage(
  imageBuffer: Buffer, 
  userId: string,
  characterId?: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any;
  
  // リトライ機構付きでアップロードを試行
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔥 Firebase Storage - Upload attempt ${attempt}/${maxRetries} for user:`, userId);
      
      if (attempt === 1) {
        // 初回のみ設定をデバッグ出力
        console.log('🔥 Storage instance app config:', {
          projectId: storage.app.options.projectId,
          storageBucket: storage.app.options.storageBucket,
          authDomain: storage.app.options.authDomain
        });
      }
      
      // ファイル名とパスを生成（リトライ時は新しいタイムスタンプを使用）
      const timestamp = Date.now() + attempt; // リトライ時の重複を防ぐ
      const fileName = characterId 
        ? `character-${characterId}-${timestamp}.png`
        : `design-${userId}-${timestamp}.png`;
      const filePath = characterId 
        ? `character-images/${fileName}`
        : `design-images/${fileName}`;
      
      console.log(`📁 Attempt ${attempt} - File path:`, filePath);
      console.log('📏 Image buffer size:', imageBuffer.length, 'bytes');
      
      const storageRef = ref(storage, filePath);
      
      // Vercel環境に最適化されたメタデータ
      const metadata = {
        contentType: 'image/png',
        customMetadata: {
          userId: userId,
          characterId: characterId || 'temp',
          uploadedAt: new Date().toISOString(),
          source: 'ai-character-generation',
          attempt: attempt.toString()
        }
      };
      
      console.log(`⬆️ Attempt ${attempt} - Starting upload to Firebase Storage...`);
      
      // アップロード実行（タイムアウト設定付き）
      const uploadPromise = uploadBytes(storageRef, imageBuffer, metadata);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), 30000)
      );
      
      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
      console.log(`✅ Attempt ${attempt} - Upload completed:`, uploadResult.metadata.fullPath);
      
      // ダウンロードURL取得（タイムアウト設定付き）
      const urlPromise = getDownloadURL(uploadResult.ref);
      const urlTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('URL fetch timeout')), 15000)
      );
      
      const downloadURL = await Promise.race([urlPromise, urlTimeoutPromise]) as string;
      console.log(`🔗 Attempt ${attempt} - Download URL obtained:`, downloadURL);
      
      return downloadURL;
      
    } catch (uploadError: any) {
      lastError = uploadError;
      console.error(`❌ Attempt ${attempt} failed with error:`, {
        code: uploadError.code,
        message: uploadError.message,
        status: uploadError.status_,
        serverResponse: uploadError.serverResponse,
        customData: uploadError.customData
      });
      
      // 最終試行でない場合は待機してリトライ
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * attempt, 5000); // 指数バックオフ（最大5秒）
        console.log(`⏱️ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // すべてのリトライが失敗した場合
  console.error(`❌ All ${maxRetries} upload attempts failed. Last error:`, lastError);
  
  // より具体的なエラーメッセージを提供
  if (lastError?.code === 'storage/unauthorized') {
    throw new Error('Firebase Storage権限エラー - 認証設定を確認してください');
  } else if (lastError?.code === 'storage/quota-exceeded') {
    throw new Error('Firebase Storageクォータ超過エラー');
  } else if (lastError?.message?.includes('timeout')) {
    throw new Error('Firebase Storageアップロードタイムアウト - ネットワーク接続を確認してください');
  } else {
    throw new Error(`画像のアップロードに失敗しました: ${lastError?.message || 'Unknown error'}`);
  }
}