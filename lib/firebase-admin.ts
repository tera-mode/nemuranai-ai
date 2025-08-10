import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin SDK の設定
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// シングルトンパターンで初期化
let adminApp: any;
try {
  adminApp = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
  console.log('🔥 Firebase Admin initialized:', {
    projectId: adminApp.options.projectId,
    storageBucket: adminApp.options.storageBucket
  });
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  console.log('Available environment variables:', {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
    publicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    publicStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

export const adminStorage = adminApp ? getStorage(adminApp) : null;

// Admin SDK を使った画像アップロード関数
export async function uploadImageWithAdmin(
  imageBuffer: Buffer, 
  filePath: string, 
  contentType: string = 'image/png'
): Promise<string> {
  if (!adminStorage) {
    throw new Error('Firebase Admin Storage not initialized');
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);
    
    console.log('📁 Admin Storage - Uploading to:', filePath);
    console.log('📦 Bucket name:', bucket.name);
    
    // ファイルをアップロード
    await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'ai-generation'
        }
      }
    });
    
    console.log('✅ Admin Storage - Upload successful');
    
    // ダウンロードURLを取得
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491' // 遠い将来の日付
    });
    
    console.log('🔗 Admin Storage - Signed URL obtained');
    return url;
    
  } catch (error) {
    console.error('❌ Admin Storage upload failed:', error);
    throw error;
  }
}

// Admin SDK を使った画像削除関数
export async function deleteImageWithAdmin(filePath: string): Promise<void> {
  if (!adminStorage) {
    throw new Error('Firebase Admin Storage not initialized');
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);
    
    console.log('🗑️ Admin Storage - Deleting:', filePath);
    console.log('📦 Bucket name:', bucket.name);
    
    // ファイルが存在するかチェック
    const [exists] = await file.exists();
    if (!exists) {
      console.log('⚠️ Admin Storage - File does not exist:', filePath);
      return;
    }
    
    // ファイルを削除
    await file.delete();
    
    console.log('✅ Admin Storage - Delete successful');
    
  } catch (error) {
    console.error('❌ Admin Storage delete failed:', error);
    throw error;
  }
}