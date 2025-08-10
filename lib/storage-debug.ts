import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { uploadImageWithAdmin, adminStorage } from './firebase-admin';

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
    return {
      success: false,
      message: 'Firebase Admin Storage test temporarily disabled'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Firebase Admin Storage test temporarily disabled'
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
      hasAdminStorage: false,
      message: 'Admin storage temporarily disabled'
    }
  };
}