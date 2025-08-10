'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DebugAuth from '@/components/DebugAuth';

interface StorageInfo {
  adminSdkAvailable: boolean;
  totalFiles: number;
  characterImages: number;
  designImages: number;
  totalSize: string;
  recentFiles: Array<{
    name: string;
    size: string;
    updated: string;
    type: string;
  }>;
}

interface TempStorageInfo {
  totalImages: number;
  memoryUsage: string;
  images: Array<{
    id: string;
    userId: string;
    characterId?: string;
    size: string;
    created: string;
  }>;
}

export default function StorageDebugPage() {
  const router = useRouter();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [tempStorageInfo, setTempStorageInfo] = useState<TempStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'firebase' | 'temp'>('firebase');

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    try {
      setLoading(true);
      
      const [storageRes, tempRes] = await Promise.all([
        fetch('/api/debug/storage'),
        fetch('/api/temp-storage-debug')
      ]);

      const [storage, temp] = await Promise.all([
        storageRes.json(),
        tempRes.json()
      ]);

      setStorageInfo(storage);
      setTempStorageInfo(temp);

    } catch (error) {
      console.error('ストレージ情報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearTempStorage = async () => {
    try {
      const response = await fetch('/api/temp-storage-debug', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('一時ストレージをクリアしました');
        fetchStorageInfo();
      } else {
        alert('一時ストレージのクリアに失敗しました');
      }
    } catch (error) {
      console.error('一時ストレージクリアエラー:', error);
      alert('一時ストレージのクリアでエラーが発生しました');
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
                className="text-white/60 hover:text-white text-2xl"
              >
                ←
              </button>
              <div className="text-3xl">💾</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">ストレージ管理</h1>
                <p className="text-white/60 text-sm">Firebase Storage & 一時ストレージ</p>
              </div>
            </div>
            
            <button
              onClick={fetchStorageInfo}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {/* タブ */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => setActiveTab('firebase')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'firebase' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Firebase Storage
            </button>
            <button
              onClick={() => setActiveTab('temp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'temp' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              一時ストレージ
            </button>
          </div>

          {loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/80">ストレージ情報を取得中...</p>
            </div>
          ) : (
            <>
              {/* Firebase Storage タブ */}
              {activeTab === 'firebase' && storageInfo && (
                <div className="space-y-6">
                  {/* 概要 */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-bold text-white mb-4">Firebase Storage 概要</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">Admin SDK</p>
                        <p className="text-white font-bold">
                          {storageInfo.adminSdkAvailable ? '✅ 利用可能' : '❌ 無効'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">総ファイル数</p>
                        <p className="text-white font-bold">{storageInfo.totalFiles}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">キャラ画像</p>
                        <p className="text-white font-bold">{storageInfo.characterImages}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">デザイン画像</p>
                        <p className="text-white font-bold">{storageInfo.designImages}</p>
                      </div>
                    </div>
                  </div>

                  {/* 最新ファイル */}
                  {storageInfo.recentFiles && storageInfo.recentFiles.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                      <h3 className="text-lg font-bold text-white mb-4">最新ファイル</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="text-left py-2 text-white/80 text-sm">ファイル名</th>
                              <th className="text-left py-2 text-white/80 text-sm">サイズ</th>
                              <th className="text-left py-2 text-white/80 text-sm">更新日時</th>
                              <th className="text-left py-2 text-white/80 text-sm">種類</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storageInfo.recentFiles.map((file, index) => (
                              <tr key={index} className="border-b border-white/10">
                                <td className="py-2 text-white text-sm font-mono">{file.name}</td>
                                <td className="py-2 text-white/80 text-sm">{file.size}</td>
                                <td className="py-2 text-white/80 text-sm">{file.updated}</td>
                                <td className="py-2 text-white/80 text-sm">{file.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 一時ストレージタブ */}
              {activeTab === 'temp' && tempStorageInfo && (
                <div className="space-y-6">
                  {/* 概要 */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-white">一時ストレージ概要</h3>
                      <button
                        onClick={clearTempStorage}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 text-sm transition-colors"
                      >
                        🗑️ クリア
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">保存画像数</p>
                        <p className="text-white font-bold">{tempStorageInfo.totalImages}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">メモリ使用量</p>
                        <p className="text-white font-bold">{tempStorageInfo.memoryUsage}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm mb-1">状態</p>
                        <p className="text-white font-bold">
                          {tempStorageInfo.totalImages > 0 ? '📋 使用中' : '🔄 空'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 一時画像リスト */}
                  {tempStorageInfo.images && tempStorageInfo.images.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                      <h3 className="text-lg font-bold text-white mb-4">一時保存中の画像</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="text-left py-2 text-white/80 text-sm">ID</th>
                              <th className="text-left py-2 text-white/80 text-sm">ユーザーID</th>
                              <th className="text-left py-2 text-white/80 text-sm">キャラID</th>
                              <th className="text-left py-2 text-white/80 text-sm">サイズ</th>
                              <th className="text-left py-2 text-white/80 text-sm">作成日時</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tempStorageInfo.images.map((image) => (
                              <tr key={image.id} className="border-b border-white/10">
                                <td className="py-2 text-white text-sm font-mono">{image.id}</td>
                                <td className="py-2 text-white/80 text-sm">{image.userId}</td>
                                <td className="py-2 text-white/80 text-sm">{image.characterId || '-'}</td>
                                <td className="py-2 text-white/80 text-sm">{image.size}</td>
                                <td className="py-2 text-white/80 text-sm">{image.created}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DebugAuth>
  );
}