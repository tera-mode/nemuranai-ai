import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedImageToStorage } from '@/lib/image-generation';
import { uploadImageWithAdmin } from '@/lib/firebase-admin';
import { generateImageId, storeTempImage } from '@/lib/temp-storage';

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId, characterId } = await request.json();

    if (!prompt || !userId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
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

    // Firebase Admin SDK で画像を保存（フォールバックあり）
    let imageUrl: string;
    let isFirebaseStorage = false;
    
    try {
      console.log('💾 Attempting to save with Firebase Admin SDK...');
      
      // ファイルパスを生成
      const timestamp = Date.now();
      const fileName = characterId 
        ? `character-${characterId}-${timestamp}.png`
        : `design-${userId}-${timestamp}.png`;
      const filePath = characterId 
        ? `character-images/${fileName}`
        : `design-images/${fileName}`;
        
      imageUrl = await uploadImageWithAdmin(
        imageBuffer,
        filePath,
        'image/png'
      );
      console.log('✅ Image saved successfully with Admin SDK');
      console.log('🔗 Firebase URL:', imageUrl);
      isFirebaseStorage = true;
    } catch (storageError) {
      console.error('❌ Firebase Admin SDK failed, trying Client SDK...', storageError);
      
      try {
        // Client SDK で試行
        imageUrl = await saveGeneratedImageToStorage(
          imageBuffer,
          userId,
          characterId
        );
        console.log('✅ Image saved with Client SDK');
        isFirebaseStorage = true;
      } catch (clientError) {
        console.error('❌ Client SDK also failed, using temporary fallback:', clientError);
        
        // 両方失敗した場合は一時ストレージを使用
        const tempImageId = generateImageId();
        storeTempImage(tempImageId, imageBase64, userId, characterId);
        imageUrl = `/api/temp-image/${tempImageId}`;
        console.log('🔄 Using temp storage fallback, ID:', tempImageId);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      isTemp: !isFirebaseStorage,
      isFirebase: isFirebaseStorage
    });

  } catch (error) {
    console.error('画像生成APIエラー:', error);
    return NextResponse.json(
      { error: '画像生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}