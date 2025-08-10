'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DebugAuth from '@/components/DebugAuth';
import { PRODUCT_PRICES } from '@/types/database';

interface UserBillingInfo {
  userId: string;
  email: string;
  displayName: string;
  subscription: string;
  subscriptionStatus: string;
  stamina: number;
  maxStamina: number;
  summonContracts: number;
  lastStaminaRecovery: string;
  createdAt: string;
  lastLogin: string;
}

interface ProductPriceEditable {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function BillingDebugPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserBillingInfo | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // 価格編集用の状態
  const [editablePrices, setEditablePrices] = useState<ProductPriceEditable[]>([
    { id: 'premium_plan', name: 'プレミアムプラン（月額）', price: PRODUCT_PRICES.premium_plan, description: '月額サブスクリプション' },
    { id: 'summon_contracts_10', name: '召喚契約書 10枚', price: PRODUCT_PRICES.summon_contracts_10, description: '召喚契約書10枚セット' },
    { id: 'stamina_recovery_100', name: 'スタミナ回復 100', price: PRODUCT_PRICES.stamina_recovery_100, description: 'スタミナ100ポイント回復' },
  ]);

  // ユーザー検索
  const searchUser = async () => {
    if (!searchUserId.trim()) {
      setError('ユーザーIDを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/billing/adjust?userId=${encodeURIComponent(searchUserId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ユーザー情報の取得に失敗しました');
      }

      setUserInfo(data);
    } catch (err: any) {
      setError(err.message);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // スタミナ/召喚契約書の調整
  const adjustValue = async (type: 'stamina' | 'summon_contracts', amount: number, reason: string) => {
    if (!userInfo) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/billing/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userInfo.userId,
          type,
          amount,
          reason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '調整に失敗しました');
      }

      setMessage(`${type === 'stamina' ? 'スタミナ' : '召喚契約書'}を${amount > 0 ? '追加' : '削減'}しました: ${data.newValue}`);
      
      // ユーザー情報を再取得
      await searchUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 決済テスト
  const testCheckout = async (productType: string) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'チェックアウト作成に失敗しました');
      }

      // 新しいタブで決済ページを開く
      window.open(data.checkoutUrl, '_blank');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // デバッグ用：課金情報リセット
  const resetBilling = async () => {
    try {
      const response = await fetch('/api/debug/reset-billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '課金情報リセットに失敗しました');
      }

      setMessage(`課金情報をリセットしました: スタミナ500、召喚契約書50枚`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };


  return (
    <DebugAuth>
      <div className="min-h-screen relative">
        {/* 背景画像 */}
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg001.jpg)' }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        
        {/* ヘッダー */}
        <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/debug')}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                ←
              </button>
              <div className="text-3xl">💰</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">課金システム管理</h1>
                <p className="text-white/60 text-sm">スタミナ・召喚契約書調整、決済テスト</p>
              </div>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-8">
          
          {/* エラー・成功メッセージ */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-500/30">
              <p className="text-red-200">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
              <p className="text-green-200">{message}</p>
            </div>
          )}

          {/* ユーザー検索 */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">ユーザー検索・管理</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="ユーザーID（Firebase Auth UID）"
                className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50"
              />
              <button
                onClick={searchUser}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 rounded-lg text-white font-medium"
              >
                {loading ? '検索中...' : '検索'}
              </button>
            </div>

            {userInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">基本情報</h3>
                    <div className="space-y-1 text-sm text-white/80">
                      <p>ID: {userInfo.userId}</p>
                      <p>Email: {userInfo.email}</p>
                      <p>名前: {userInfo.displayName}</p>
                      <p>プラン: {userInfo.subscription}</p>
                      <p>サブスク状態: {userInfo.subscriptionStatus}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">課金情報</h3>
                    <div className="space-y-1 text-sm text-white/80">
                      <p>スタミナ: {userInfo.stamina} / {userInfo.maxStamina}</p>
                      <p>召喚契約書: {userInfo.summonContracts}枚</p>
                      <p>最終スタミナ回復: {new Date(userInfo.lastStaminaRecovery).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                </div>

                {/* 調整パネル */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-4">値の調整</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* スタミナ調整 */}
                    <div>
                      <h4 className="text-white mb-2">スタミナ調整</h4>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => adjustValue('stamina', -50, 'デバッグ: スタミナ-50')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-sm"
                        >
                          -50
                        </button>
                        <button
                          onClick={() => adjustValue('stamina', -10, 'デバッグ: スタミナ-10')}
                          className="px-3 py-1 bg-red-400 hover:bg-red-500 rounded text-white text-sm"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => adjustValue('stamina', 10, 'デバッグ: スタミナ+10')}
                          className="px-3 py-1 bg-green-400 hover:bg-green-500 rounded text-white text-sm"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => adjustValue('stamina', 50, 'デバッグ: スタミナ+50')}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-white text-sm"
                        >
                          +50
                        </button>
                        <button
                          onClick={() => adjustValue('stamina', 100, 'デバッグ: スタミナ+100')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                        >
                          +100
                        </button>
                      </div>
                    </div>

                    {/* 召喚契約書調整 */}
                    <div>
                      <h4 className="text-white mb-2">召喚契約書調整</h4>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => adjustValue('summon_contracts', -5, 'デバッグ: 召喚契約書-5')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-sm"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => adjustValue('summon_contracts', -1, 'デバッグ: 召喚契約書-1')}
                          className="px-3 py-1 bg-red-400 hover:bg-red-500 rounded text-white text-sm"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => adjustValue('summon_contracts', 1, 'デバッグ: 召喚契約書+1')}
                          className="px-3 py-1 bg-green-400 hover:bg-green-500 rounded text-white text-sm"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => adjustValue('summon_contracts', 5, 'デバッグ: 召喚契約書+5')}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-white text-sm"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => adjustValue('summon_contracts', 10, 'デバッグ: 召喚契約書+10')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 商品価格設定 */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">商品価格設定</h2>
            <p className="text-white/70 mb-4 text-sm">
              ⚠️ これは表示用です。実際の価格変更はコードの PRODUCT_PRICES 定数を変更してください。
            </p>
            <div className="space-y-4">
              {editablePrices.map((product) => (
                <div key={product.id} className="flex items-center gap-4 bg-white/5 rounded-lg p-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{product.name}</h3>
                    <p className="text-white/60 text-sm">{product.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={product.price}
                      onChange={(e) => {
                        const newPrice = parseInt(e.target.value) || 0;
                        setEditablePrices(prev => 
                          prev.map(p => p.id === product.id ? { ...p, price: newPrice } : p)
                        );
                      }}
                      className="w-24 px-3 py-1 rounded bg-white/20 border border-white/30 text-white text-right"
                    />
                    <span className="text-white/80">円</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* デバッグ用リセット */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">デバッグ用リセット</h2>
            <p className="text-white/70 mb-4 text-sm">
              ⚠️ 開発環境でのみ利用可能。現在のユーザーの課金情報をデバッグ用の値にリセットします。
            </p>
            <button
              onClick={resetBilling}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded text-white font-medium"
            >
              🔄 課金情報リセット（スタミナ500、召喚契約書50枚）
            </button>
          </div>

          {/* 決済テスト */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">決済テスト</h2>
            <p className="text-white/70 mb-4 text-sm">
              ⚠️ テスト環境での決済テストを行います。実際の決済は発生しません（Stripeテストモード）。
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => testCheckout('premium_plan')}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded text-white font-medium"
              >
                プレミアムプラン決済テスト
              </button>
              <button
                onClick={() => testCheckout('summon_contracts')}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded text-white font-medium"
              >
                召喚契約書購入テスト
              </button>
              <button
                onClick={() => testCheckout('stamina_recovery')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white font-medium"
              >
                スタミナ回復購入テスト
              </button>
            </div>
          </div>

          {/* 現在のプラン設定表示 */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 drop-shadow-lg">現在のプラン設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">無料プラン</h3>
                <div className="space-y-1 text-sm text-white/80">
                  <p>初期召喚契約書: 5枚</p>
                  <p>初期スタミナ: 20</p>
                  <p>最大スタミナ: 50</p>
                  <p>日次回復: 10</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">プレミアムプラン</h3>
                <div className="space-y-1 text-sm text-white/80">
                  <p>初期召喚契約書: 25枚（+20ボーナス）</p>
                  <p>初期スタミナ: 220（+200ボーナス）</p>
                  <p>最大スタミナ: 500</p>
                  <p>日次回復: 10</p>
                  <p>月次ボーナス召喚契約書: 20枚</p>
                  <p>月次ボーナススタミナ: 200</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </DebugAuth>
  );
}