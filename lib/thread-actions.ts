import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ChatThread, ChatMessage } from '@/types/database';

// スレッド作成
export async function createThread(userId: string, characterId: string): Promise<string> {
  try {
    const now = new Date();
    const threadData: Omit<ChatThread, 'id'> = {
      userId,
      characterId,
      title: '新しい会話', // 後で自動生成で更新
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      lastMessage: '',
    };

    const docRef = await addDoc(collection(db, 'threads'), threadData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw new Error('スレッド作成に失敗しました');
  }
}

// ユーザーのスレッド一覧取得
export async function getUserThreads(userId: string, characterId?: string): Promise<ChatThread[]> {
  try {
    let q;
    
    if (characterId) {
      // 特定のキャラクターのスレッドのみ取得する場合
      q = query(
        collection(db, 'threads'),
        where('userId', '==', userId),
        where('characterId', '==', characterId),
        orderBy('updatedAt', 'desc')
      );
    } else {
      // 全キャラクターのスレッドを取得する場合
      q = query(
        collection(db, 'threads'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const threads: ChatThread[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // FirestoreのタイムスタンプをDateオブジェクトに変換
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt);
      
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt instanceof Date 
        ? data.updatedAt 
        : new Date(data.updatedAt);
      
      threads.push({
        id: doc.id,
        ...data,
        createdAt,
        updatedAt
      } as ChatThread);
    });
    
    return threads;
  } catch (error) {
    console.error('Error fetching threads:', error);
    return [];
  }
}

// 特定のスレッド取得
export async function getThreadById(threadId: string): Promise<ChatThread | null> {
  try {
    const docRef = doc(db, 'threads', threadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt);
      
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt instanceof Date 
        ? data.updatedAt 
        : new Date(data.updatedAt);
      
      return {
        id: docSnap.id,
        ...data,
        createdAt,
        updatedAt
      } as ChatThread;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching thread:', error);
    return null;
  }
}

// スレッドのメッセージ取得
export async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    // インデックス作成まで orderBy を除外
    const q = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId)
    );
    
    const querySnapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp instanceof Timestamp 
        ? data.timestamp.toDate() 
        : data.timestamp instanceof Date 
        ? data.timestamp 
        : new Date(data.timestamp);
      
      messages.push({
        id: doc.id,
        ...data,
        timestamp
      } as ChatMessage);
    });
    
    // クライアントサイドでソート（インデックス作成まで）
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return [];
  }
}

// スレッドにメッセージ追加
export async function addMessageToThread(
  threadId: string,
  characterId: string,
  userId: string,
  content: string,
  type: 'user' | 'assistant',
  isMarkdown: boolean = false
): Promise<string> {
  try {
    // メッセージ追加
    const messageData: Omit<ChatMessage, 'id'> = {
      threadId,
      characterId,
      userId,
      content,
      type,
      timestamp: new Date(),
      isMarkdown,
    };

    const docRef = await addDoc(collection(db, 'messages'), messageData);

    // スレッド情報更新
    await updateThreadInfo(threadId, content);

    return docRef.id;
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw new Error('メッセージの追加に失敗しました');
  }
}

// 最近のスレッド取得
export async function getRecentThreads(userId: string, limitCount: number = 5): Promise<ChatThread[]> {
  try {
    const q = query(
      collection(db, 'threads'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const threads: ChatThread[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt);
      
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt instanceof Date 
        ? data.updatedAt 
        : new Date(data.updatedAt);
      
      threads.push({
        id: doc.id,
        ...data,
        createdAt,
        updatedAt
      } as ChatThread);
    });
    
    return threads;
  } catch (error) {
    console.error('Error fetching recent threads:', error);
    return [];
  }
}

// スレッド情報更新（メッセージ数、最後のメッセージ、更新日時）
async function updateThreadInfo(threadId: string, lastMessage: string): Promise<void> {
  try {
    const threadRef = doc(db, 'threads', threadId);
    
    // 現在のメッセージ数を取得
    const messages = await getThreadMessages(threadId);
    const messageCount = messages.length + 1; // 今追加されるメッセージを含む
    
    await updateDoc(threadRef, {
      messageCount,
      lastMessage: lastMessage.substring(0, 100), // プレビュー用に100文字まで
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating thread info:', error);
  }
}

// スレッドタイトル自動生成
export async function generateThreadTitle(threadId: string): Promise<boolean> {
  try {
    console.log('🔄 Starting title generation for thread:', threadId);
    
    // 最初の数メッセージを取得
    const messages = await getThreadMessages(threadId);
    console.log('📨 Retrieved messages:', messages.length);
    
    if (messages.length < 2) {
      console.log('⚠️ Not enough messages for title generation');
      return false;
    }
    
    // 最初の2-3メッセージから会話の内容を抽出
    const conversationSample = messages
      .slice(0, 3)
      .map(msg => `${msg.type === 'user' ? 'ユーザー' : 'AI'}: ${msg.content.substring(0, 100)}`)
      .join('\n');
    
    console.log('💬 Conversation sample:', conversationSample);
    
    // Claude APIを直接使ってタイトルを生成（fetchの代わり）
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `以下の会話内容から、適切なスレッドタイトルを生成してください。タイトルは10文字以下で、会話の主要なテーマを表すものにしてください。

会話内容:
${conversationSample}

タイトルのみを返してください（「タイトル：」などの接頭辞は不要）。日本語で簡潔に。`,
        },
      ],
    });

    const title = response.content[0]?.type === 'text' 
      ? response.content[0].text.trim() 
      : '会話';
    const finalTitle = title.substring(0, 10); // 10文字制限
    console.log('✨ Generated title:', finalTitle);
    
    if (!finalTitle || finalTitle === '新しい会話') {
      console.log('⚠️ Invalid title generated, skipping update');
      return false;
    }
    
    // スレッドタイトルを更新
    const threadRef = doc(db, 'threads', threadId);
    await updateDoc(threadRef, {
      title: finalTitle,
      updatedAt: new Date(),
    });
    
    console.log('✅ Title updated successfully');
    return true; // 成功を示す
  } catch (error) {
    console.error('❌ Error generating thread title:', error);
    return false;
  }
}