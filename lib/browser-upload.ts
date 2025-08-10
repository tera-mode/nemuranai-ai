import { storage, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ブラウザサイドでの画像アップロード（認証済みユーザー用）
export async function uploadImageToFirebaseStorage(
  imageData: string, // base64 or blob URL
  userId: string,
  characterId?: string
): Promise<string> {
  try {
    console.log('🌐 Browser-side upload starting for user:', userId);
    
    // Firebase認証状態の詳細デバッグ
    const currentUser = auth.currentUser;
    console.log('🔐 Firebase Auth Debug:', {
      isSignedIn: !!currentUser,
      uid: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      providerId: currentUser?.providerId,
      providerData: currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        uid: p.uid,
        email: p.email
      }))
    });
    
    // 認証トークンの取得と検証
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true); // forceRefresh
        const tokenResult = await currentUser.getIdTokenResult();
        console.log('🎫 Auth Token Debug:', {
          hasToken: !!token,
          tokenLength: token?.length,
          expirationTime: tokenResult.expirationTime,
          issuedAtTime: tokenResult.issuedAtTime,
          signInProvider: tokenResult.signInProvider,
          claims: Object.keys(tokenResult.claims || {})
        });
      } catch (tokenError) {
        console.error('❌ Token error:', tokenError);
      }
    } else {
      console.error('❌ No authenticated user found!');
      throw new Error('User not authenticated - please sign in again');
    }
    
    // Base64データをBlobに変換
    let imageBlob: Blob;
    
    if (imageData.startsWith('data:image/')) {
      // Base64 data URLの場合
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else if (imageData.startsWith('/api/temp-image/')) {
      // 一時ストレージURLの場合
      const response = await fetch(imageData);
      imageBlob = await response.blob();
    } else {
      throw new Error('Unsupported image data format');
    }
    
    console.log('📏 Image blob size:', imageBlob.size, 'bytes');
    
    // ファイル名とパスを生成
    const timestamp = Date.now();
    const fileName = characterId 
      ? `character-${characterId}-${timestamp}.png`
      : `design-${userId}-${timestamp}.png`;
    const filePath = characterId 
      ? `character-images/${fileName}`
      : `design-images/${fileName}`;
    
    console.log('📁 Upload path:', filePath);
    
    const storageRef = ref(storage, filePath);
    
    // メタデータ
    const metadata = {
      contentType: 'image/png',
      customMetadata: {
        userId: userId,
        characterId: characterId || 'temp',
        uploadedAt: new Date().toISOString(),
        source: 'browser-upload'
      }
    };
    
    console.log('⬆️ Starting browser-side upload...');
    
    // アップロード実行
    const uploadResult = await uploadBytes(storageRef, imageBlob, metadata);
    console.log('✅ Browser upload completed:', uploadResult.metadata.fullPath);
    
    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('🔗 Download URL obtained:', downloadURL);
    
    return downloadURL;
    
  } catch (error: any) {
    console.error('❌ Browser-side upload failed:', error);
    throw new Error(`ブラウザサイドアップロードに失敗: ${error.message}`);
  }
}

// 一時画像を永続化する関数
export async function permanentizeTemporaryImage(
  tempImageUrl: string,
  userId: string,
  characterId?: string
): Promise<string> {
  try {
    console.log('🔄 Permanentizing temporary image:', tempImageUrl);
    
    if (!tempImageUrl.startsWith('/api/temp-image/')) {
      // 既に永続化済みの場合はそのまま返す
      console.log('✅ Image already permanent:', tempImageUrl);
      return tempImageUrl;
    }
    
    // ブラウザサイドでFirebase Storageにアップロード
    const permanentUrl = await uploadImageToFirebaseStorage(
      tempImageUrl,
      userId,
      characterId
    );
    
    console.log('✅ Image permanentized:', permanentUrl);
    return permanentUrl;
    
  } catch (error: any) {
    console.warn('⚠️ Failed to permanentize image, keeping temporary:', error.message);
    // 永続化に失敗した場合は一時URLをそのまま返す
    return tempImageUrl;
  }
}