import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { AICharacter, CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';

export interface CreateCharacterData {
  name: string;
  gender: CharacterGender;
  race: CharacterRace;
  age: CharacterAge;
  skinTone: SkinTone;
  personality: PersonalityType;
  domain: BusinessDomain;
  appearance: {
    themeColor: string;
    outfit: string;
    accessories: string[];
  };
  backstory: string;
  userId: string;
  profileImageUrl?: string;
}

// キャラクター作成
export async function createCharacter(data: CreateCharacterData): Promise<string> {
  try {
    // undefinedフィールドを除去してcharacterDataを構築
    const characterData: Omit<AICharacter, 'id'> = {
      name: data.name,
      gender: data.gender,
      race: data.race,
      age: data.age,
      skinTone: data.skinTone,
      personality: data.personality,
      domain: data.domain,
      appearance: data.appearance,
      backstory: data.backstory,
      userId: data.userId,
      level: 1,
      experience: 0,
      stats: {
        efficiency: Math.floor(Math.random() * 20) + 70, // 70-90
        creativity: Math.floor(Math.random() * 20) + 70,
        empathy: Math.floor(Math.random() * 20) + 70,
        accuracy: Math.floor(Math.random() * 20) + 70,
      },
      createdAt: new Date(),
      isActive: true,
    };

    // profileImageUrlが存在する場合のみ追加
    if (data.profileImageUrl) {
      // Base64データURLの場合はFirestoreに保存しない（制限を超えるため）
      if (!data.profileImageUrl.startsWith('data:image/')) {
        characterData.profileImageUrl = data.profileImageUrl;
      } else {
        console.log('Base64 image data detected, skipping Firestore save to avoid size limit');
        // Base64データは一時的なものなので、Firestoreには保存しない
        // 必要に応じて後でFirebase Storageに保存するか、一時URLに変更する
      }
    }

    const docRef = await addDoc(collection(db, 'characters'), characterData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating character:', error);
    throw new Error('キャラクター作成に失敗しました');
  }
}

// ユーザーのキャラクター一覧取得
export async function getUserCharacters(userId: string): Promise<AICharacter[]> {
  try {
    console.log(`Getting characters for user: ${userId}`);
    
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const characters: AICharacter[] = [];
    
    console.log(`Found ${querySnapshot.size} characters in Firestore`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Character: ${doc.id}, name: ${data.name}, isActive: ${data.isActive}`);
      
      // FirestoreのタイムスタンプをDateオブジェクトに変換
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt);
      
      characters.push({
        id: doc.id,
        ...data,
        createdAt
      } as AICharacter);
    });
    
    console.log(`Returning ${characters.length} characters to UI`);
    return characters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
}

// 特定のキャラクター取得
export async function getCharacterById(characterId: string): Promise<AICharacter | null> {
  try {
    const docRef = doc(db, 'characters', characterId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // FirestoreのタイムスタンプをDateオブジェクトに変換
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt);
      
      return {
        id: docSnap.id,
        ...data,
        createdAt
      } as AICharacter;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching character:', error);
    return null;
  }
}

// キャラクター更新
export async function updateCharacter(characterId: string, updates: Partial<Omit<AICharacter, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  try {
    const docRef = doc(db, 'characters', characterId);
    
    // Base64データURLの場合は除去（Firestoreの制限を超えるため）
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.profileImageUrl && sanitizedUpdates.profileImageUrl.startsWith('data:image/')) {
      console.log('Base64 image data detected in update, removing to avoid size limit');
      delete sanitizedUpdates.profileImageUrl;
    }
    
    await updateDoc(docRef, sanitizedUpdates);
  } catch (error) {
    console.error('Error updating character:', error);
    throw new Error('キャラクターの更新に失敗しました');
  }
}

// キャラクター削除（関連データも含む）
export async function deleteCharacter(characterId: string, userId: string): Promise<void> {
  try {
    console.log(`Starting deletion of character ${characterId} for user ${userId}`);
    
    // キャラクターが存在するか確認
    const docRef = doc(db, 'characters', characterId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`Character ${characterId} does not exist, nothing to delete`);
      return;
    }
    
    const characterData = docSnap.data();
    console.log(`Character to delete: ${characterData.name}, isActive: ${characterData.isActive}`);
    
    // 1. プロフィール画像をFirebase Storageから削除
    if (characterData.profileImageUrl && !characterData.profileImageUrl.startsWith('data:image/')) {
      await deleteCharacterProfileImage(characterData.profileImageUrl);
    }
    
    // 2. 関連するスレッドを取得して削除
    await deleteCharacterThreads(userId, characterId);
    
    // 3. 関連する一時画像を削除
    await deleteCharacterTempImages(characterId);
    
    // 4. キャラクター本体を削除
    await deleteDoc(docRef);
    console.log(`Deleted character document ${characterId} from Firestore`);
    
    // 5. 削除後の確認
    const verifyDocSnap = await getDoc(docRef);
    if (verifyDocSnap.exists()) {
      console.error(`WARNING: Character ${characterId} still exists after deletion!`);
    } else {
      console.log(`Verified: Character ${characterId} successfully deleted from Firestore`);
    }
    
    console.log(`Successfully deleted character ${characterId} and all related data`);
  } catch (error) {
    console.error('Error deleting character:', error);
    throw new Error('キャラクターの削除に失敗しました');
  }
}

// キャラクター関連のスレッドとメッセージを削除
async function deleteCharacterThreads(userId: string, characterId: string): Promise<void> {
  try {
    // キャラクターに関連するスレッドを取得
    const threadsQuery = query(
      collection(db, 'threads'),
      where('userId', '==', userId),
      where('characterId', '==', characterId)
    );
    
    const threadsSnapshot = await getDocs(threadsQuery);
    console.log(`Found ${threadsSnapshot.size} threads to delete`);
    
    // 各スレッドとそのメッセージを削除
    for (const threadDoc of threadsSnapshot.docs) {
      const threadId = threadDoc.id;
      
      // スレッドに関連するメッセージを削除
      const messagesQuery = query(
        collection(db, 'messages'),
        where('threadId', '==', threadId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log(`Deleting ${messagesSnapshot.size} messages for thread ${threadId}`);
      
      // メッセージを削除
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(messageDoc.ref);
      }
      
      // スレッドを削除
      await deleteDoc(threadDoc.ref);
    }
    
    console.log(`Deleted ${threadsSnapshot.size} threads and their messages`);
  } catch (error) {
    console.error('Error deleting character threads:', error);
    throw error;
  }
}

// キャラクターのプロフィール画像をFirebase Storageから削除
async function deleteCharacterProfileImage(imageUrl: string): Promise<void> {
  try {
    console.log(`Attempting to delete profile image: ${imageUrl}`);
    const { deleteImageByUrl } = await import('@/lib/image-upload');
    await deleteImageByUrl(imageUrl);
    console.log(`Successfully deleted profile image from Firebase Storage`);
  } catch (error) {
    console.error('Error deleting character profile image from Firebase Storage:', error);
    // Firebase Storage削除のエラーは致命的ではないので、警告のみ
  }
}

// キャラクター関連の一時画像を削除
async function deleteCharacterTempImages(characterId: string): Promise<void> {
  try {
    // 一時ストレージから該当キャラクターの画像を削除
    const { getStorageStats, deleteTempImage } = await import('@/lib/temp-storage');
    const stats = getStorageStats();
    
    let deletedCount = 0;
    for (const image of stats.images) {
      if (image.characterId === characterId || image.characterId.startsWith(`temp-${characterId}`)) {
        const deleted = deleteTempImage(image.id);
        if (deleted) {
          deletedCount++;
        }
      }
    }
    
    console.log(`Deleted ${deletedCount} temporary images for character ${characterId}`);
  } catch (error) {
    console.error('Error deleting character temp images:', error);
    // 一時画像削除のエラーは致命的ではないので、警告のみ
  }
}