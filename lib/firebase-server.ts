import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// サーバーサイド用のFirebase Admin SDK初期化
const initializeFirebaseAdmin = () => {
  // 既に初期化されている場合はそれを使用
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // 環境変数から設定を取得
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK環境変数が設定されていません');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);