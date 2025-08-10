import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { PLAN_SETTINGS } from '@/types/database';
import { recoverDailyStamina } from '@/lib/billing-service';

// 全ユーザーの日次スタミナ回復処理
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    // API Keyによる認証（Cron Job用）
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.CRON_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily stamina recovery for all users...');
    
    // 全ユーザーを取得（バッチ処理）
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const results = {
      total: users.length,
      processed: 0,
      recovered: 0,
      skipped: 0,
      errors: 0
    };

    const batchSize = 100; // Firebase の制限を考慮
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          const result = await recoverDailyStamina(user.id);
          results.processed++;
          
          if (result.success) {
            results.recovered++;
            console.log(`Recovered ${result.recovered} stamina for user ${user.id}: ${result.newStamina}`);
          } else {
            results.skipped++;
            if (result.error !== 'Already recovered today') {
              console.warn(`Skipped user ${user.id}: ${result.error}`);
            }
          }
        } catch (error) {
          results.errors++;
          console.error(`Error recovering stamina for user ${user.id}:`, error);
        }
      }));
    }

    console.log('Daily stamina recovery completed:', results);

    return NextResponse.json({
      message: 'Daily stamina recovery completed',
      results
    });
  } catch (error) {
    console.error('Error in daily stamina recovery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 個別ユーザーの手動スタミナ回復（Admin用）
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await recoverDailyStamina(userId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        recovered: result.recovered,
        currentStamina: result.newStamina
      }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Stamina recovered successfully',
      recovered: result.recovered,
      newStamina: result.newStamina
    });
  } catch (error) {
    console.error('Error in manual stamina recovery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}