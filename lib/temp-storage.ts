// 一時的な画像ストレージ（メモリ内）
// 本来はRedisやMemcachedを使うべきですが、簡易実装

interface TempImageData {
  base64: string;
  timestamp: number;
  userId: string;
  characterId: string;
}

// メモリ内の一時ストレージ
const tempStorage = new Map<string, TempImageData>();

// 7日後に自動削除（開発中は長めに設定）
const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7日間

// クリーンアップ関数
export function cleanupOldImages() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  tempStorage.forEach((data, key) => {
    if (now - data.timestamp > CLEANUP_INTERVAL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => tempStorage.delete(key));
}

// 画像IDを生成
export function generateImageId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 画像を一時保存
export function storeTempImage(
  imageId: string, 
  base64: string, 
  userId: string, 
  characterId: string
): void {
  console.log('Storing temp image:', {
    imageId,
    userId,
    characterId,
    base64Size: base64.length,
    timestamp: new Date().toISOString()
  });
  
  tempStorage.set(imageId, {
    base64,
    timestamp: Date.now(),
    userId,
    characterId
  });
  
  console.log(`Total images in storage: ${tempStorage.size}`);
  
  // 古い画像をクリーンアップ
  cleanupOldImages();
}

// 画像を取得
export function getTempImage(imageId: string): TempImageData | null {
  console.log('Requesting temp image:', imageId);
  console.log('Available images:', Array.from(tempStorage.keys()));
  
  const data = tempStorage.get(imageId);
  if (!data) {
    console.log('Image not found in storage');
    return null;
  }
  
  // 期限切れチェック
  const age = Date.now() - data.timestamp;
  if (age > CLEANUP_INTERVAL) {
    console.log('Image expired, age:', age, 'limit:', CLEANUP_INTERVAL);
    tempStorage.delete(imageId);
    return null;
  }
  
  console.log('Image found, size:', data.base64.length);
  return data;
}

// 画像を削除
export function deleteTempImage(imageId: string): boolean {
  return tempStorage.delete(imageId);
}

// デバッグ用：現在のストレージ状況
export function getStorageStats() {
  const images: Array<{
    id: string;
    userId: string;
    characterId: string;
    timestamp: Date;
    size: number;
  }> = [];
  
  tempStorage.forEach((data, id) => {
    images.push({
      id,
      userId: data.userId,
      characterId: data.characterId,
      timestamp: new Date(data.timestamp),
      size: data.base64.length
    });
  });
  
  return {
    totalImages: tempStorage.size,
    images
  };
}