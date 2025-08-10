'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DebugAuth from '@/components/DebugAuth';

interface Analytics {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
  };
  characterStats: {
    totalCharacters: number;
    charactersToday: number;
    charactersWeek: number;
    popularPersonalities: Array<{ type: string; count: number }>;
    popularDomains: Array<{ domain: string; count: number }>;
  };
  systemStats: {
    totalApiCalls: number;
    imageGenerations: number;
    chatMessages: number;
    errorRate: number;
    uptime: string;
  };
}

export default function AnalyticsDebugPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // 複数のAPIから分析データを収集
      const [usersRes, charactersRes] = await Promise.all([
        fetch('/api/debug/users'),
        fetch('/api/debug/characters')
      ]);

      const [users, characters] = await Promise.all([
        usersRes.json(),
        charactersRes.json()
      ]);

      // 基本的な分析データを生成（実際の実装では詳細な分析が必要）
      const mockAnalytics: Analytics = {
        userStats: {
          totalUsers: users.totalUsers || 0,
          activeUsers: Math.floor((users.totalUsers || 0) * 0.7), // 仮の値
          newUsersToday: Math.floor(Math.random() * 5),
          newUsersWeek: Math.floor(Math.random() * 20)
        },
        characterStats: {
          totalCharacters: characters.totalCharacters || 0,
          charactersToday: Math.floor(Math.random() * 10),
          charactersWeek: Math.floor(Math.random() * 50),
          popularPersonalities: [
            { type: 'genki', count: Math.floor(Math.random() * 20) + 10 },
            { type: 'tsundere', count: Math.floor(Math.random() * 15) + 5 },
            { type: 'kuudere', count: Math.floor(Math.random() * 12) + 3 },
            { type: 'oneesan', count: Math.floor(Math.random() * 10) + 2 }
          ],
          popularDomains: [
            { domain: 'technology', count: Math.floor(Math.random() * 25) + 15 },
            { domain: 'marketing', count: Math.floor(Math.random() * 20) + 10 },
            { domain: 'design', count: Math.floor(Math.random() * 18) + 8 },
            { domain: 'finance', count: Math.floor(Math.random() * 15) + 5 }
          ]
        },
        systemStats: {
          totalApiCalls: Math.floor(Math.random() * 1000) + 500,
          imageGenerations: Math.floor(Math.random() * 200) + 100,
          chatMessages: Math.floor(Math.random() * 500) + 200,
          errorRate: Math.random() * 5, // パーセント
          uptime: '99.8%'
        }
      };

      setAnalytics(mockAnalytics);

    } catch (error) {
      console.error('アナリティクスデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'from-blue-500 to-cyan-500' }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: string;
    color?: string;
  }) => (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <h3 className="text-white font-bold text-lg">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <p className="text-white/60 text-sm">{subtitle}</p>
    </div>
  );

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
              <div className="text-3xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">システム分析</h1>
                <p className="text-white/60 text-sm">使用状況・統計・パフォーマンス</p>
              </div>
            </div>
            
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              🔄 更新
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          
          {loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/80">分析データを取得中...</p>
            </div>
          ) : analytics ? (
            <div className="space-y-8">
              
              {/* ユーザー統計 */}
              <div>
                <h2 className="text-xl font-bold text-white mb-6 drop-shadow-lg">ユーザー統計</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="総ユーザー数"
                    value={analytics.userStats.totalUsers}
                    subtitle="累計登録ユーザー"
                    icon="👥"
                    color="from-blue-500 to-cyan-500"
                  />
                  <StatCard
                    title="アクティブユーザー"
                    value={analytics.userStats.activeUsers}
                    subtitle="最近活動したユーザー"
                    icon="🟢"
                    color="from-green-500 to-emerald-500"
                  />
                  <StatCard
                    title="今日の新規"
                    value={analytics.userStats.newUsersToday}
                    subtitle="本日の新規登録"
                    icon="🆕"
                    color="from-orange-500 to-red-500"
                  />
                  <StatCard
                    title="週間新規"
                    value={analytics.userStats.newUsersWeek}
                    subtitle="過去7日間の新規登録"
                    icon="📈"
                    color="from-purple-500 to-pink-500"
                  />
                </div>
              </div>

              {/* キャラクター統計 */}
              <div>
                <h2 className="text-xl font-bold text-white mb-6 drop-shadow-lg">キャラクター統計</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    title="総キャラクター数"
                    value={analytics.characterStats.totalCharacters}
                    subtitle="作成されたキャラクター"
                    icon="🎭"
                    color="from-indigo-500 to-purple-500"
                  />
                  <StatCard
                    title="今日の作成"
                    value={analytics.characterStats.charactersToday}
                    subtitle="本日作成されたキャラ"
                    icon="✨"
                    color="from-pink-500 to-rose-500"
                  />
                  <StatCard
                    title="週間作成"
                    value={analytics.characterStats.charactersWeek}
                    subtitle="過去7日間の作成数"
                    icon="📊"
                    color="from-cyan-500 to-blue-500"
                  />
                  <StatCard
                    title="平均作成率"
                    value={`${(analytics.characterStats.charactersWeek / 7).toFixed(1)}/日`}
                    subtitle="1日あたりの平均"
                    icon="📅"
                    color="from-emerald-500 to-teal-500"
                  />
                </div>

                {/* 人気ランキング */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-bold text-white mb-4">人気の性格タイプ</h3>
                    <div className="space-y-3">
                      {analytics.characterStats.popularPersonalities.map((item, index) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">#{index + 1}</span>
                            <span className="text-white font-medium">{item.type}</span>
                          </div>
                          <span className="text-white/80 font-bold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-lg font-bold text-white mb-4">人気の専門分野</h3>
                    <div className="space-y-3">
                      {analytics.characterStats.popularDomains.map((item, index) => (
                        <div key={item.domain} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">#{index + 1}</span>
                            <span className="text-white font-medium">{item.domain}</span>
                          </div>
                          <span className="text-white/80 font-bold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* システム統計 */}
              <div>
                <h2 className="text-xl font-bold text-white mb-6 drop-shadow-lg">システム統計</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatCard
                    title="API呼び出し"
                    value={analytics.systemStats.totalApiCalls}
                    subtitle="総API呼び出し数"
                    icon="🔗"
                    color="from-violet-500 to-purple-500"
                  />
                  <StatCard
                    title="画像生成"
                    value={analytics.systemStats.imageGenerations}
                    subtitle="生成された画像数"
                    icon="🎨"
                    color="from-pink-500 to-rose-500"
                  />
                  <StatCard
                    title="チャット数"
                    value={analytics.systemStats.chatMessages}
                    subtitle="送信されたメッセージ"
                    icon="💬"
                    color="from-blue-500 to-indigo-500"
                  />
                  <StatCard
                    title="エラー率"
                    value={`${analytics.systemStats.errorRate.toFixed(2)}%`}
                    subtitle="システムエラー率"
                    icon="⚠️"
                    color="from-red-500 to-orange-500"
                  />
                  <StatCard
                    title="稼働率"
                    value={analytics.systemStats.uptime}
                    subtitle="システム稼働率"
                    icon="🟢"
                    color="from-green-500 to-emerald-500"
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-6 border border-red-500/30 text-center">
              <p className="text-red-300">分析データの取得に失敗しました</p>
            </div>
          )}
        </div>
      </div>
    </DebugAuth>
  );
}