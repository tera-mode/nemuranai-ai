import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestoreの初期化（キャッシュを無効にする設定）
export const db = getFirestore(app);

// デバッグ用：ネットワーク無効化/有効化関数をエクスポート
export const refreshFirestore = async () => {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    console.log('Firestore network refreshed');
  } catch (error) {
    console.error('Error refreshing Firestore network:', error);
  }
};

// Firebase Storage の初期化をより明示的に
console.log('Firebase Storage Bucket:', firebaseConfig.storageBucket);
export const storage = getStorage(app);