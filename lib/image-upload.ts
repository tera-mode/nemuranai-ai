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

// 古い画像を削除（URLから）- API経由でAdmin SDKを使用
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  try {
    console.log(`Deleting image via API: ${imageUrl}`);
    
    // API経由で削除
    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API削除失敗: ${errorData.error} - ${errorData.details || ''}`);
    }

    const result = await response.json();
    console.log(`Successfully deleted image via API:`, result);
    
  } catch (error: any) {
    console.error('画像削除エラー:', error);
    console.error('画像削除エラー詳細:', {
      message: error?.message || 'Unknown error',
      imageUrl,
      stack: error?.stack
    });
    
    // 削除エラーは致命的ではないのでログのみ（例外は投げない）
  }
}

// Firebase Storage URLからファイルパスを抽出
function extractFilePathFromStorageUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // パターン1: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?{params}
    let pathMatch = urlObj.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+)/);
    if (pathMatch && pathMatch[1]) {
      const encodedPath = pathMatch[1];
      const decodedPath = decodeURIComponent(encodedPath);
      console.log(`Extracted file path (pattern 1): ${decodedPath} from URL: ${url}`);
      return decodedPath;
    }
    
    // パターン2: https://storage.googleapis.com/{bucket}/{path}?{params}
    if (urlObj.hostname === 'storage.googleapis.com') {
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2) {
        // 最初の部分はバケット名なので除去
        const filePath = pathParts.slice(1).join('/');
        console.log(`Extracted file path (pattern 2): ${filePath} from URL: ${url}`);
        return filePath;
      }
    }
    
    console.error('Could not extract file path from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting file path from Storage URL:', error);
    return null;
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