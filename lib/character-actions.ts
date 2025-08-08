import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { AICharacter, CharacterRace, PersonalityType, BusinessDomain } from '@/types/database';

export interface CreateCharacterData {
  name: string;
  race: CharacterRace;
  personality: PersonalityType;
  domain: BusinessDomain;
  appearance: {
    hairColor: string;
    eyeColor: string;
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
      race: data.race,
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
      characterData.profileImageUrl = data.profileImageUrl;
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
    const q = query(
      collection(db, 'characters'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const characters: AICharacter[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
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