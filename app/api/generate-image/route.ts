import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedImageToStorage } from '@/lib/image-generation';
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

    // まず Firebase Storage に保存を試行
    let imageUrl: string;
    
    try {
      console.log('Attempting to save to Firebase Storage...');
      imageUrl = await saveGeneratedImageToStorage(
        imageBuffer,
        userId,
        characterId
      );
      console.log('Image saved successfully, URL:', imageUrl);
    } catch (storageError) {
      console.error('Firebase Storage failed, falling back to temp storage:', storageError);
      
      // Firebase Storage に失敗した場合は一時ストレージを使用
      const tempImageId = generateImageId();
      storeTempImage(tempImageId, imageBase64, userId, characterId);
      imageUrl = `/api/temp-image/${tempImageId}`;
      console.log('Using temp storage fallback, ID:', tempImageId);
      
      // 開発中はデバッグ情報を出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Temp storage debug - saved image with ID:', tempImageId);
        console.log('Image will be available at:', imageUrl);
      }
    }

    // 開発環境では確実に画像を表示するためBase64も返す
    const apiResponse: any = {
      success: true,
      imageUrl,
      prompt,
      isTemp: imageUrl.startsWith('/api/temp-image/'),
      isBase64: false
    };

    // 一時ストレージ使用時は安全のためBase64データも返す
    if (imageUrl.startsWith('/api/temp-image/') && process.env.NODE_ENV === 'development') {
      apiResponse.base64Fallback = `data:image/png;base64,${imageBase64}`;
    }

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('画像生成APIエラー:', error);
    return NextResponse.json(
      { error: '画像生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}