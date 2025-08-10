import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// 特定のユーザーにAdmin権限を付与（開発時のみ使用）
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    // Development環境でのみ実行可能
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    const { userId, email } = await request.json();
    
    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 });
    }

    let userRef;
    if (userId) {
      userRef = db.collection('users').doc(userId);
    } else {
      // emailでユーザーを検索
      const querySnapshot = await db.collection('users').where('email', '==', email).get();
      if (querySnapshot.empty) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userRef = querySnapshot.docs[0].ref;
    }

    // Admin権限を付与
    await userRef.update({
      isAdmin: true
    });

    return NextResponse.json({
      message: 'Admin permission granted successfully',
      userId: userRef.id
    });
  } catch (error) {
    console.error('Error setting admin permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}