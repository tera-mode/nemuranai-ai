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

    // Firestore からユーザーデータを取得
    let totalUsers = 0;
    let users: any[] = [];
    let recentUsers: any[] = [];

    try {
      if (db) {
        // ユーザー数を取得
        const usersSnapshot = await db.collection('users').get();
        totalUsers = usersSnapshot.size;

        // 最新のユーザー5人を取得
        const recentUsersSnapshot = await db.collection('users')
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get();

        recentUsers = recentUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown'
        }));

        // 全ユーザーリスト（必要に応じて制限）
        const allUsersSnapshot = await db.collection('users')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        users = allUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name,
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || 'unknown',
          lastSignIn: doc.data().lastSignInTime?.toDate?.()?.toISOString() || 'unknown'
        }));
      }
    } catch (dbError) {
      console.error('Firestore query error:', dbError);
    }

    return NextResponse.json({
      success: true,
      totalUsers,
      users,
      recentUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Users debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user data',
        totalUsers: 0,
        users: [],
        recentUsers: []
      },
      { status: 500 }
    );
  }
}