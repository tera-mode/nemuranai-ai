import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin SDK の設定（Vercel対応版）
function createFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  
  // 必須環境変数の検証
  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error(`Missing Firebase Admin SDK environment variables:
      - FIREBASE_PROJECT_ID: ${!!projectId}
      - FIREBASE_CLIENT_EMAIL: ${!!clientEmail}
      - FIREBASE_PRIVATE_KEY: ${!!privateKey}
      - FIREBASE_STORAGE_BUCKET: ${!!storageBucket}`);
  }
  
  // プライベートキーの改行文字処理（Vercel対応）
  const processedPrivateKey = privateKey.replace(/\\n/g, '\n');
  
  return {
    credential: cert({
      projectId,
      clientEmail,
      privateKey: processedPrivateKey,
    }),
    storageBucket,
  };
}

// シングルトンパターンで初期化（エラーハンドリング強化）
let adminApp: any = null;
try {
  if (getApps().length === 0) {
    const config = createFirebaseAdminConfig();
    adminApp = initializeApp(config);
    console.log('🔥 Firebase Admin SDK initialized successfully:', {
      projectId: adminApp.options.projectId,
      storageBucket: adminApp.options.storageBucket,
      credential: '✅ Loaded'
    });
  } else {
    adminApp = getApps()[0];
    console.log('🔥 Firebase Admin SDK already initialized');
  }
} catch (error: any) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.log('🔍 Environment variables debug:', {
    NODE_ENV: process.env.NODE_ENV,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasPublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyPrefix: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50),
    hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
    hasPublicStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  adminApp = null; // 明示的にnullに設定
}

export const adminStorage = adminApp ? getStorage(adminApp) : null;

// Admin SDK を使った画像アップロード関数
export async function uploadImageWithAdmin(
  imageBuffer: Buffer, 
  filePath: string, 
  contentType: string = 'image/png'
): Promise<string> {
  if (!adminStorage) {
    console.error('❌ Firebase Admin Storage not initialized - missing environment variables?');
    console.log('Debug - Environment check:', {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET
    });
    throw new Error('Firebase Admin Storage not initialized - check server environment variables');
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);
    
    console.log('📁 Admin Storage - Uploading to:', filePath);
    console.log('📦 Bucket name:', bucket.name);
    console.log('📏 Buffer size:', imageBuffer.length, 'bytes');
    
    // より詳細なメタデータでファイルをアップロード
    const uploadResult = await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'ai-character-generation',
          bufferSize: imageBuffer.length.toString(),
          filePath: filePath
        }
      },
      // より安全なアップロード設定
      resumable: false, // 小さなファイルなのでレジュマブルアップロードを無効
      validation: 'crc32c' // 整合性チェックを有効
    });
    
    console.log('✅ Admin Storage - Upload successful');
    
    // パブリックアクセス可能にする
    await file.makePublic();
    console.log('✅ Admin Storage - File made public');
    
    // パブリックURLを生成（Signed URLより高速で安定）
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    console.log('🔗 Admin Storage - Public URL generated:', publicUrl);
    return publicUrl;
    
  } catch (error: any) {
    console.error('❌ Admin Storage upload failed with detailed error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      metadata: error.metadata
    });
    
    // より具体的なエラーメッセージを提供
    if (error.code === 'PERMISSION_DENIED') {
      throw new Error('Firebase Admin SDK権限エラー - Storage権限を確認してください');
    } else if (error.code === 'NOT_FOUND') {
      throw new Error('Firebase Storageバケットが見つかりません');
    } else if (error.message?.includes('quota')) {
      throw new Error('Firebase Storageクォータ超過エラー');
    } else {
      throw new Error(`Firebase Admin Storage upload failed: ${error.message}`);
    }
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