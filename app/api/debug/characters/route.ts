import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminUser } from '@/lib/debug-auth';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let totalCharacters = 0;
    let characters: any[] = [];
    let recentCharacters: any[] = [];

    try {
      if (db) {
        // キャラクター数を取得
        const charactersSnapshot = await db.collection('characters').get();
        totalCharacters = charactersSnapshot.size;

        // 最新のキャラクター5体を取得
        const recentCharactersSnapshot = await db.collection('characters')
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get();

        recentCharacters = recentCharactersSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown'
        }));

        // 全キャラクターリスト（制限付き）
        const allCharactersSnapshot = await db.collection('characters')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        characters = allCharactersSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.data().name || 'Unknown',
          userId: doc.data().userId || 'unknown',
          personality: doc.data().personality || 'unknown',
          domain: doc.data().domain || 'unknown',
          profileImageUrl: doc.data().profileImageUrl,
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown'
        }));
      } else {
        console.warn('Firestore database not available for characters query');
      }
    } catch (dbError) {
      console.error('Firestore characters query error:', dbError);
    }

    return NextResponse.json({
      success: true,
      totalCharacters,
      characters,
      recentCharacters,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Characters debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch character data',
        totalCharacters: 0,
        characters: [],
        recentCharacters: []
      },
      { status: 500 }
    );
  }
}