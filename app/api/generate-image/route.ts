import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedImageToStorage } from '@/lib/image-generation';
import { uploadImageWithAdmin } from '@/lib/firebase-admin';
import { generateImageId, storeTempImage } from '@/lib/temp-storage';
import { consumeStamina, consumeSummonContract, getUserBillingInfo } from '@/lib/billing-service';

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId, characterId, isCharacterCreation } = await request.json();
    let staminaResult;

    if (!prompt || !userId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // キャラクター作成時は事前に召喚契約書の残数をチェックのみ（まだ消費しない）
    if (isCharacterCreation) {
      const userBilling = await getUserBillingInfo(userId);
      
      if (!userBilling || userBilling.summonContracts < 1) {
        return NextResponse.json(
          { 
            error: `召喚契約書が不足しています。必要: 1枚, 現在: ${userBilling?.summonContracts || 0}枚`,
            currentContracts: userBilling?.summonContracts || 0,
            requiredContracts: 1
          },
          { status: 400 }
        );
      }
    } else {
      // 通常の画像生成時はスタミナを事前消費（既存の処理を維持）
      const STAMINA_COST = 30;
      staminaResult = await consumeStamina(userId, STAMINA_COST);
      
      if (!staminaResult.success) {
        return NextResponse.json(
          { 
            error: staminaResult.error === 'Insufficient stamina' 
              ? `スタミナが不足しています。必要: ${STAMINA_COST}, 現在: ${staminaResult.currentStamina}`
              : staminaResult.error,
            currentStamina: staminaResult.currentStamina,
            requiredStamina: STAMINA_COST
          },
          { status: 400 }
        );
      }
    }

    const stabilityApiKey = process.env.STABILITY_API_KEY;
    if (!stabilityApiKey) {
      return NextResponse.json(
        { error: 'Stability AI APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // デバッグ用: 最終的な画像生成パラメータをコンソールに出力
    console.log('👤 === CHARACTER IMAGE API REQUEST DEBUG ===');
    console.log('📝 Positive Prompt:', prompt);
    console.log('❌ Negative Prompt:', 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, multiple girls, realistic, 3d');
    console.log('👤 User ID:', userId);
    console.log('🆔 Character ID:', characterId);
    console.log('📐 Image Size: 1024x1024');
    console.log('⚙️ CFG Scale: 7, Steps: 30, Style: anime');
    console.log('⏰ Request Time:', new Date().toISOString());
    console.log('👤 ============================================');

    // Stability AI APIに画像生成リクエスト
    const stabilityResponse = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabilityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            {
              text: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, multiple girls, realistic, 3d',
              weight: -1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30,
          style_preset: 'anime'
        }),
      }
    );

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error('Stability API エラー:', errorText);
      return NextResponse.json(
        { error: `画像生成に失敗しました: ${stabilityResponse.status}` },
        { status: stabilityResponse.status }
      );
    }

    const responseData = await stabilityResponse.json();
    
    // デバッグ用: API応答をログ出力
    console.log('✅ === STABILITY API RESPONSE DEBUG ===');
    console.log('📊 Response Status:', stabilityResponse.status);
    console.log('🖼️ Artifacts Count:', responseData.artifacts?.length || 0);
    console.log('💰 Credits Used:', responseData.credits_consumed || 'unknown');
    console.log('⏱️ Generation Time:', new Date().toISOString());
    
    if (!responseData.artifacts || responseData.artifacts.length === 0) {
      console.log('❌ No artifacts in response');
      console.log('✅ ====================================');
      return NextResponse.json(
        { error: '画像が生成されませんでした' },
        { status: 500 }
      );
    }

    // Base64画像データを取得
    const imageBase64 = responseData.artifacts[0].base64;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    console.log('📏 Generated Image Size:', imageBuffer.length, 'bytes');
    console.log('✅ ====================================');

    // 改良版：Admin SDK優先でフォールバック付きアップロード
    let imageUrl: string;
    let isFirebaseStorage = false;
    
    try {
      console.log('💾 Attempting Firebase Admin SDK upload...');
      
      // ファイルパスを生成
      const timestamp = Date.now();
      const fileName = characterId 
        ? `character-${characterId}-${timestamp}.png`
        : `design-${userId}-${timestamp}.png`;
      const filePath = characterId 
        ? `character-images/${fileName}`
        : `design-images/${fileName}`;
      
      // Firebase Admin SDK で直接アップロード
      imageUrl = await uploadImageWithAdmin(
        imageBuffer,
        filePath,
        'image/png'
      );
      
      console.log('✅ Admin SDK upload successful:', imageUrl);
      isFirebaseStorage = true;
      
    } catch (adminError: any) {
      console.warn('⚠️ Admin SDK failed, using fallback strategy:', adminError.message);
      
      // Admin SDK失敗時は一時ストレージにフォールバック
      const tempImageId = generateImageId();
      storeTempImage(tempImageId, imageBase64, userId, characterId);
      imageUrl = `/api/temp-image/${tempImageId}`;
      console.log('🔄 Fallback: Image stored in temp storage, ID:', tempImageId);
      
      // Admin SDK失敗の理由をログ出力（デバッグ用）
      if (adminError.message?.includes('not initialized')) {
        console.log('📋 Admin SDK not initialized - likely missing environment variables');
      } else if (adminError.message?.includes('permission')) {
        console.log('📋 Admin SDK permission denied - check service account credentials');
      } else if (adminError.message?.includes('quota')) {
        console.log('📋 Admin SDK quota exceeded - check Firebase billing');
      } else {
        console.log('📋 Admin SDK unknown error:', adminError.code);
      }
    }

    // キャラクター作成時は画像生成成功後に召喚契約書を消費
    let contractResult;
    if (isCharacterCreation) {
      contractResult = await consumeSummonContract(userId, 1);
      
      if (!contractResult.success) {
        console.error('Failed to consume summon contract after successful image generation:', contractResult.error);
        // 画像生成は成功したが契約書消費に失敗した場合の警告
        // この時点では既に画像は生成済みなので、エラーを返すのではなく警告ログのみ
      }
    }

    // レスポンスに消費情報を含める
    const finalResponse: any = {
      success: true,
      imageUrl,
      prompt,
      isTemp: !isFirebaseStorage,
      isFirebase: isFirebaseStorage
    };

    // 消費情報を追加（キャラクター作成時は召喚契約書、通常時はスタミナ）
    if (isCharacterCreation && contractResult) {
      finalResponse.contractsConsumed = 1;
      finalResponse.remainingContracts = contractResult.currentContracts;
    } else if (!isCharacterCreation) {
      // 通常の画像生成時のスタミナ情報（既に事前消費済み）
      const STAMINA_COST = 30;
      finalResponse.staminaConsumed = STAMINA_COST;
      finalResponse.remainingStamina = staminaResult?.currentStamina;
    }

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('画像生成APIエラー:', error);
    return NextResponse.json(
      { error: '画像生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}