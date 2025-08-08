import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// 画像ファイルの検証
export function validateImageFile(file: File): string | null {
  // ファイルサイズ制限 (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'ファイルサイズは5MB以下にしてください。';
  }

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return '対応ファイル形式: JPEG, PNG, GIF, WebP';
  }

  return null; // エラーなし
}

// キャラクタープロフィール画像をアップロード
export async function uploadCharacterImage(
  file: File, 
  characterId: string, 
  userId: string
): Promise<string> {
  try {
    // ファイル検証
    const validationError = validateImageFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    // ファイルパスの生成
    const fileExtension = file.name.split('.').pop();
    const fileName = `character-${characterId}-${Date.now()}.${fileExtension}`;
    const filePath = `users/${userId}/characters/${characterId}/${fileName}`;

    // Firebase Storageにアップロード
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    
    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('画像アップロードエラー:', error);
    throw new Error('画像のアップロードに失敗しました。');
  }
}

// 古い画像を削除（URLから）
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  try {
    // Firebase Storage URLから参照を作成
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('画像削除エラー:', error);
    // 削除エラーは致命的ではないのでログのみ
  }
}

// 画像URLからファイル名を抽出
export function extractFileNameFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return fileName.split('?')[0]; // クエリパラメータを除去
  } catch {
    return 'unknown';
  }
}