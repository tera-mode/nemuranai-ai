'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DebugAuth from '@/components/DebugAuth';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string;
}

interface Character {
  id: string;
  name: string;
  userId: string;
  personality: string;
  domain: string;
  createdAt: string;
  profileImageUrl?: string;
}

interface UserData {
  totalUsers: number;
  users: User[];
  recentUsers: User[];
}

interface CharacterData {
  totalCharacters: number;
  characters: Character[];
  recentCharacters: Character[];
}

export default function UsersDebugPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'characters'>('users');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, charactersRes] = await Promise.all([
        fetch('/api/debug/users'),
        fetch('/api/debug/characters')
      ]);

      const [users, characters] = await Promise.all([
        usersRes.json(),
        charactersRes.json()
      ]);

      setUserData(users);
      setCharacterData(characters);

    } catch (error) {
      console.error('ユーザーデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'unknown') return '不明';
    try {
      return new Date(dateString).toLocaleString('ja-JP');
    } catch {
      return '不明';
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
              <div className="text-3xl">👥</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">ユーザー管理</h1>
                <p className="text-white/60 text-sm">ユーザー & キャラクター管理</p>
              </div>
            </div>
            
            <button
              onClick={fetchUserData}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {/* 統計情報 */}
          {!loading && userData && characterData && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">👤</div>
                  <h3 className="text-lg font-bold text-white">ユーザー統計</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{userData.totalUsers}</div>
                <p className="text-white/60 text-sm">総登録ユーザー数</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🎭</div>
                  <h3 className="text-lg font-bold text-white">キャラクター統計</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{characterData.totalCharacters}</div>
                <p className="text-white/60 text-sm">総作成キャラクター数</p>
              </div>
            </div>
          )}

          {/* タブ */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'users' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              ユーザー一覧
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'characters' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              キャラクター一覧
            </button>
          </div>

          {loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/80">データを取得中...</p>
            </div>
          ) : (
            <>
              {/* ユーザー一覧タブ */}
              {activeTab === 'users' && userData && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-4">登録ユーザー一覧</h3>
                  {userData.users.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-2 text-white/80 text-sm">メールアドレス</th>
                            <th className="text-left py-2 text-white/80 text-sm">名前</th>
                            <th className="text-left py-2 text-white/80 text-sm">登録日</th>
                            <th className="text-left py-2 text-white/80 text-sm">最終ログイン</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.users.map((user) => (
                            <tr key={user.id} className="border-b border-white/10">
                              <td className="py-3 text-white text-sm">{user.email}</td>
                              <td className="py-3 text-white/80 text-sm">{user.name || '-'}</td>
                              <td className="py-3 text-white/80 text-sm">{formatDate(user.createdAt)}</td>
                              <td className="py-3 text-white/80 text-sm">{formatDate(user.lastSignIn)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-8">ユーザーが見つかりません</p>
                  )}
                </div>
              )}

              {/* キャラクター一覧タブ */}
              {activeTab === 'characters' && characterData && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-lg font-bold text-white mb-4">作成キャラクター一覧</h3>
                  {characterData.characters.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left py-2 text-white/80 text-sm">画像</th>
                            <th className="text-left py-2 text-white/80 text-sm">名前</th>
                            <th className="text-left py-2 text-white/80 text-sm">性格</th>
                            <th className="text-left py-2 text-white/80 text-sm">専門分野</th>
                            <th className="text-left py-2 text-white/80 text-sm">作成者</th>
                            <th className="text-left py-2 text-white/80 text-sm">作成日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {characterData.characters.map((character) => (
                            <tr key={character.id} className="border-b border-white/10">
                              <td className="py-3">
                                {character.profileImageUrl ? (
                                  <img
                                    src={character.profileImageUrl}
                                    alt={character.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white/60 text-sm">
                                    ?
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-white text-sm font-medium">{character.name}</td>
                              <td className="py-3 text-white/80 text-sm">{character.personality}</td>
                              <td className="py-3 text-white/80 text-sm">{character.domain}</td>
                              <td className="py-3 text-white/80 text-sm font-mono text-xs">
                                {character.userId && typeof character.userId === 'string' 
                                  ? character.userId.substring(0, 8) + '...' 
                                  : 'unknown'}
                              </td>
                              <td className="py-3 text-white/80 text-sm">{formatDate(character.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-8">キャラクターが見つかりません</p>
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