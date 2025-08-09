import { NextResponse } from 'next/server';
import { getUserCharacters } from '@/lib/character-actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }
    
    // ユーザーのキャラクター一覧を取得
    const characters = await getUserCharacters(userId);
    
    // デバッグ情報を含めてレスポンス
    return NextResponse.json({
      success: true,
      userId,
      charactersCount: characters.length,
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        isActive: char.isActive,
        createdAt: char.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Debug characters error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}