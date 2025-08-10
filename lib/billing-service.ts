import { db } from '@/lib/firebase-admin';
import { UserProfile, PLAN_SETTINGS, BillingTransaction } from '@/types/database';

// ユーザーの課金情報を取得
export async function getUserBillingInfo(userId: string): Promise<UserProfile | null> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      createdAt: userData.createdAt?.toDate() || new Date(),
      lastLogin: userData.lastLogin?.toDate() || new Date(),
      lastStaminaRecovery: userData.lastStaminaRecovery?.toDate() || new Date(),
      subscriptionStartDate: userData.subscriptionStartDate?.toDate(),
      subscriptionEndDate: userData.subscriptionEndDate?.toDate(),
    } as UserProfile;
  } catch (error) {
    console.error('Error fetching user billing info:', error);
    throw error;
  }
}

// 新しいユーザーを初期設定で作成
export async function initializeUserBilling(userId: string, email: string, displayName: string): Promise<UserProfile> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  const freeSettings = PLAN_SETTINGS.free;
  const now = new Date();
  
  const newUser: Omit<UserProfile, 'id'> = {
    email,
    displayName,
    subscription: 'free',
    createdAt: now,
    lastLogin: now,
    summonContracts: freeSettings.initialSummonContracts,
    stamina: freeSettings.initialStamina,
    maxStamina: freeSettings.maxStamina,
    lastStaminaRecovery: now,
    subscriptionStatus: 'inactive',
    isAdmin: false
  };

  try {
    await db.collection('users').doc(userId).set(newUser);
    return { id: userId, ...newUser };
  } catch (error) {
    console.error('Error initializing user billing:', error);
    throw error;
  }
}

// スタミナを消費
export async function consumeStamina(userId: string, amount: number): Promise<{ success: boolean; currentStamina: number; error?: string }> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, currentStamina: 0, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const currentStamina = userData.stamina || 0;
      
      if (currentStamina < amount) {
        return { success: false, currentStamina, error: 'Insufficient stamina' };
      }
      
      const newStamina = currentStamina - amount;
      transaction.update(userRef, { stamina: newStamina });
      
      return { success: true, currentStamina: newStamina };
    });
  } catch (error) {
    console.error('Error consuming stamina:', error);
    throw error;
  }
}

// 召喚契約書を消費
export async function consumeSummonContract(userId: string, amount: number = 1): Promise<{ success: boolean; currentContracts: number; error?: string }> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, currentContracts: 0, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const currentContracts = userData.summonContracts || 0;
      
      if (currentContracts < amount) {
        return { success: false, currentContracts, error: 'Insufficient summon contracts' };
      }
      
      const newContracts = currentContracts - amount;
      transaction.update(userRef, { summonContracts: newContracts });
      
      return { success: true, currentContracts: newContracts };
    });
  } catch (error) {
    console.error('Error consuming summon contract:', error);
    throw error;
  }
}

// Admin権限でスタミナを追加/削除
export async function adjustStamina(adminUserId: string, targetUserId: string, amount: number, reason: string, skipAdminCheck: boolean = false): Promise<{ success: boolean; newStamina: number; error?: string }> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    // Admin権限チェック（skipAdminCheckがtrueの場合はスキップ）
    if (!skipAdminCheck) {
      const adminDoc = await db.collection('users').doc(adminUserId).get();
      if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
        return { success: false, newStamina: 0, error: 'Admin permission required' };
      }
    }

    const userRef = db.collection('users').doc(targetUserId);
    
    return await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, newStamina: 0, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const currentStamina = userData.stamina || 0;
      const maxStamina = userData.maxStamina || PLAN_SETTINGS.free.maxStamina;
      
      let newStamina = currentStamina + amount;
      
      // 最大値と最小値の制限
      if (newStamina > maxStamina) {
        newStamina = maxStamina;
      }
      if (newStamina < 0) {
        newStamina = 0;
      }
      
      transaction.update(userRef, { stamina: newStamina });
      
      // 調整履歴を記録
      const adjustmentRecord = {
        adminUserId,
        targetUserId,
        type: 'stamina_adjustment',
        amount,
        previousValue: currentStamina,
        newValue: newStamina,
        reason,
        timestamp: new Date()
      };
      
      transaction.set(db.collection('admin_actions').doc(), adjustmentRecord);
      
      return { success: true, newStamina };
    });
  } catch (error) {
    console.error('Error adjusting stamina:', error);
    throw error;
  }
}

// Admin権限で召喚契約書を追加/削除
export async function adjustSummonContracts(adminUserId: string, targetUserId: string, amount: number, reason: string, skipAdminCheck: boolean = false): Promise<{ success: boolean; newContracts: number; error?: string }> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    // Admin権限チェック（skipAdminCheckがtrueの場合はスキップ）
    if (!skipAdminCheck) {
      const adminDoc = await db.collection('users').doc(adminUserId).get();
      if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
        return { success: false, newContracts: 0, error: 'Admin permission required' };
      }
    }

    const userRef = db.collection('users').doc(targetUserId);
    
    return await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, newContracts: 0, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const currentContracts = userData.summonContracts || 0;
      
      let newContracts = currentContracts + amount;
      
      // 最小値の制限（負の値にならない）
      if (newContracts < 0) {
        newContracts = 0;
      }
      
      transaction.update(userRef, { summonContracts: newContracts });
      
      // 調整履歴を記録
      const adjustmentRecord = {
        adminUserId,
        targetUserId,
        type: 'summon_contracts_adjustment',
        amount,
        previousValue: currentContracts,
        newValue: newContracts,
        reason,
        timestamp: new Date()
      };
      
      transaction.set(db.collection('admin_actions').doc(), adjustmentRecord);
      
      return { success: true, newContracts };
    });
  } catch (error) {
    console.error('Error adjusting summon contracts:', error);
    throw error;
  }
}

// 毎日のスタミナ回復処理
export async function recoverDailyStamina(userId: string): Promise<{ success: boolean; recovered: number; newStamina: number; error?: string }> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const userRef = db.collection('users').doc(userId);
    
    return await db.runTransaction(async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        return { success: false, recovered: 0, newStamina: 0, error: 'User not found' };
      }
      
      const userData = userDoc.data();
      const currentStamina = userData.stamina || 0;
      const maxStamina = userData.maxStamina || PLAN_SETTINGS.free.maxStamina;
      const subscription = userData.subscription || 'free';
      const lastRecovery = userData.lastStaminaRecovery?.toDate() || new Date(0);
      
      const now = new Date();
      const recoverySettings = PLAN_SETTINGS[subscription as keyof typeof PLAN_SETTINGS];
      
      // 今日既に回復済みかチェック
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0); // 朝5時
      if (lastRecovery >= today) {
        return { success: false, recovered: 0, newStamina: currentStamina, error: 'Already recovered today' };
      }
      
      const recoveryAmount = recoverySettings.dailyStaminaRecovery;
      let newStamina = Math.min(currentStamina + recoveryAmount, maxStamina);
      let actualRecovered = newStamina - currentStamina;
      
      transaction.update(userRef, { 
        stamina: newStamina,
        lastStaminaRecovery: now
      });
      
      return { success: true, recovered: actualRecovered, newStamina };
    });
  } catch (error) {
    console.error('Error recovering daily stamina:', error);
    throw error;
  }
}

// 取引履歴を記録
export async function recordTransaction(transaction: Omit<BillingTransaction, 'id' | 'createdAt'>): Promise<string> {
  if (!db) {
    throw new Error('Firebase Admin not initialized');
  }

  try {
    const transactionData = {
      ...transaction,
      createdAt: new Date()
    };
    
    const docRef = await db.collection('billing_transactions').add(transactionData);
    return docRef.id;
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
}