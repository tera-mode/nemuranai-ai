'use client';

import React, { useState, useEffect } from 'react';
import { Zap, ScrollText } from 'lucide-react';

interface BillingStatusProps {
  className?: string;
}

interface BillingData {
  stamina: number;
  maxStamina: number;
  summonContracts: number;
  subscription: 'free' | 'premium';
  lastUpdate?: Date;
}

export default function BillingStatus({ className = '' }: BillingStatusProps) {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    try {
      setError(null);
      
      const [staminaResponse, contractsResponse] = await Promise.all([
        fetch('/api/billing/stamina'),
        fetch('/api/billing/summon-contracts')
      ]);

      if (!staminaResponse.ok || !contractsResponse.ok) {
        // 課金情報が未初期化の可能性があるので初期化を試す
        console.log('Billing data not found, attempting to initialize...');
        
        const initResponse = await fetch('/api/user/initialize-billing', {
          method: 'POST'
        });
        
        if (initResponse.ok) {
          // 初期化成功後、再度データを取得
          const [retryStaminaResponse, retryContractsResponse] = await Promise.all([
            fetch('/api/billing/stamina'),
            fetch('/api/billing/summon-contracts')
          ]);
          
          if (retryStaminaResponse.ok && retryContractsResponse.ok) {
            const staminaData = await retryStaminaResponse.json();
            const contractsData = await retryContractsResponse.json();

            setBillingData({
              stamina: staminaData.stamina,
              maxStamina: staminaData.maxStamina,
              summonContracts: contractsData.summonContracts,
              subscription: staminaData.maxStamina > 100 ? 'premium' : 'free',
              lastUpdate: new Date()
            });
            return;
          }
        }
        
        throw new Error('Failed to fetch billing data');
      }

      const staminaData = await staminaResponse.json();
      const contractsData = await contractsResponse.json();

      setBillingData({
        stamina: staminaData.stamina,
        maxStamina: staminaData.maxStamina,
        summonContracts: contractsData.summonContracts,
        subscription: staminaData.maxStamina > 100 ? 'premium' : 'free', // 簡易的な判定
        lastUpdate: new Date()
      });
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('課金情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回ロードと1分間隔での更新
  useEffect(() => {
    fetchBillingData();
    
    const interval = setInterval(() => {
      fetchBillingData();
    }, 60000); // 1分間隔

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 w-20 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !billingData) {
    return (
      <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
        <span className="text-sm">⚠️ データ取得エラー</span>
      </div>
    );
  }

  const staminaPercentage = (billingData.stamina / billingData.maxStamina) * 100;
  const isLowStamina = staminaPercentage < 20;
  const isLowContracts = billingData.summonContracts <= 1;

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* スタミナ表示 */}
      <div 
        className="flex items-center space-x-2 cursor-help group relative"
        title="スタミナ: AI機能の利用に必要なポイント。毎日朝5時に回復します。"
      >
        <Zap className={`h-4 w-4 ${isLowStamina ? 'text-red-400' : 'text-white'}`} />
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${isLowStamina ? 'text-red-300' : 'text-white'}`}>
              {billingData.stamina}
            </span>
            <span className="text-xs text-white/70">/ {billingData.maxStamina}</span>
          </div>
          <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                isLowStamina ? 'bg-red-400' : 'bg-white'
              }`}
              style={{ width: `${Math.max(staminaPercentage, 2)}%` }}
            />
          </div>
        </div>
        {isLowStamina && (
          <span className="text-xs text-red-300 animate-pulse">!</span>
        )}
        
        {/* ツールチップ */}
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          スタミナ: AI機能の利用に必要なポイント<br/>毎日朝5時に回復します
          <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/90"></div>
        </div>
      </div>

      {/* 召喚契約書表示 */}
      <div 
        className="flex items-center space-x-2 cursor-help group relative"
        title="召喚契約書: AI社員の作成に必要なアイテム。"
      >
        <ScrollText className={`h-4 w-4 ${isLowContracts ? 'text-red-400' : 'text-white'}`} />
        <span className={`text-sm font-medium ${isLowContracts ? 'text-red-300' : 'text-white'}`}>
          {billingData.summonContracts}枚
        </span>
        {isLowContracts && (
          <span className="text-xs text-red-300 animate-pulse">!</span>
        )}
        
        {/* ツールチップ */}
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          召喚契約書: AI社員の作成に必要なアイテム
          <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/90"></div>
        </div>
      </div>
    </div>
  );
}