import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadImageWithAdmin, adminStorage } from './firebase-admin';

export async function testFirebaseStorageConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔍 Testing Firebase Storage connection...');
    
    // 1. Storage instance check
    if (!storage) {
      return {
        success: false,
        message: 'Storage instance not initialized'
      };
    }
    
    console.log('✅ Storage instance available');
    
    // 2. Create a test file reference
    const testRef = ref(storage, 'test/connection-test.txt');
    console.log('✅ Storage ref created:', testRef.fullPath);
    
    // 3. Try to upload a small test file
    const testData = new TextEncoder().encode('Connection test');
    const uploadResult = await uploadBytes(testRef, testData, {
      contentType: 'text/plain'
    });
    
    console.log('✅ Test upload successful:', uploadResult.metadata.fullPath);
    
    // 4. Try to get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('✅ Download URL obtained:', downloadURL);
    
    return {
      success: true,
      message: 'Firebase Storage connection successful',
      details: {
        bucket: storage.app.options.storageBucket,
        testFile: uploadResult.metadata.fullPath,
        downloadURL
      }
    };
    
  } catch (error: any) {
    console.error('❌ Firebase Storage test failed:', error);
    return {
      success: false,
      message: `Firebase Storage test failed: ${error.message}`,
      details: {
        code: error.code,
        message: error.message,
        status: error.status_,
        serverResponse: error.serverResponse,
        customData: error.customData
      }
    };
  }
}

export async function testFirebaseAdminStorage(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔍 Testing Firebase Admin Storage...');
    
    if (!adminStorage) {
      return {
        success: false,
        message: 'Firebase Admin Storage not initialized'
      };
    }
    
    // テスト画像データ（1x1 PNG）
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25,
      0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const testFilePath = 'test/admin-test.png';
    const downloadUrl = await uploadImageWithAdmin(testImageBuffer, testFilePath, 'image/png');
    
    return {
      success: true,
      message: 'Firebase Admin Storage connection successful',
      details: {
        downloadUrl,
        testFile: testFilePath
      }
    };
    
  } catch (error: any) {
    console.error('❌ Firebase Admin Storage test failed:', error);
    return {
      success: false,
      message: `Firebase Admin Storage test failed: ${error.message}`,
      details: {
        code: error.code,
        message: error.message
      }
    };
  }
}

export function getStorageInfo() {
  return {
    clientStorage: {
      hasStorage: !!storage,
      appName: storage?.app?.name,
      projectId: storage?.app?.options?.projectId,
      storageBucket: storage?.app?.options?.storageBucket,
      authDomain: storage?.app?.options?.authDomain
    },
    adminStorage: {
      hasAdminStorage: !!adminStorage,
      adminProjectId: adminStorage?.app?.options?.projectId,
      adminStorageBucket: adminStorage?.app?.options?.storageBucket
    }
  };
}