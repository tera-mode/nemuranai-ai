'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCharacterById, updateCharacter, deleteCharacter } from '@/lib/character-actions';
import { AICharacter } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { HamburgerMenu } from '@/components/HamburgerMenu';

export default function EditCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;
  
  const [character, setCharacter] = useState<AICharacter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    race: '',
    personality: '',
    domain: '',
    backstory: '',
    appearance: {
      hairColor: '',
      eyeColor: ''
    }
  });

  const loadCharacter = useCallback(async () => {
    try {
      setIsLoading(true);
      const characterData = await getCharacterById(characterId);
      
      if (characterData) {
        setCharacter(characterData);
        setFormData({
          name: characterData.name,
          race: characterData.race,
          personality: characterData.personality,
          domain: characterData.domain,
          backstory: characterData.backstory || '',
          appearance: {
            hairColor: characterData.appearance?.hairColor || '',
            eyeColor: characterData.appearance?.eyeColor || ''
          }
        });
      }
    } catch (error) {
      console.error('キャラクター読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);

  const handleSave = async () => {
    if (!character || !session?.user) return;

    try {
      setIsSaving(true);
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      await updateCharacter(characterId, {
        name: formData.name,
        race: formData.race as any,
        personality: formData.personality as any,
        domain: formData.domain as any,
        backstory: formData.backstory,
        appearance: {
          ...formData.appearance,
          outfit: character?.appearance?.outfit || '',
          accessories: character?.appearance?.accessories || []
        }
      });

      router.push(`/character/${characterId}/threads`);
    } catch (error) {
      console.error('保存エラー:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!character || !session?.user) return;

    // 確認ダイアログ
    const confirmMessage = `本当に「${character.name}」を削除しますか？\n\n削除すると以下のデータが完全に削除されます：\n・キャラクター情報\n・すべての会話履歴\n・関連する画像\n\nこの操作は取り消せません。`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // 二重確認
    const finalConfirm = window.prompt(
      `削除を実行するには、キャラクター名「${character.name}」を正確に入力してください:`
    );

    if (finalConfirm !== character.name) {
      alert('キャラクター名が一致しません。削除をキャンセルしました。');
      return;
    }

    try {
      setIsDeleting(true);
      const userId = session.user.id || session.user.email;
      if (!userId) return;

      await deleteCharacter(characterId, userId);
      
      alert(`「${character.name}」を完全に削除しました。`);
      // refresh パラメータを付けてデータの再読み込みを強制
      router.push('/home?refresh=true');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (session?.user?.id) {
      loadCharacter();
    }
  }, [session, status, router, loadCharacter]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: character?.profileImageUrl 
              ? `url(${character.profileImageUrl})` 
              : 'url(/bg001.jpg)' 
          }}
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="text-white text-2xl drop-shadow-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!session || !character) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* 背景画像 */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: character.profileImageUrl 
            ? `url(${character.profileImageUrl})` 
            : 'url(/bg001.jpg)' 
        }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      {character.profileImageUrl && (
        <div className="fixed inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      )}
      
      {/* ヘッダー */}
      <PageHeader
        title={`${character.name}の編集`}
        onBack={() => router.push(`/character/${characterId}/threads`)}
        rightComponent={<HamburgerMenu />}
      />

      {/* コンテンツ */}
      <div className="relative z-10 px-4 pt-20 pb-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* 基本情報 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">基本情報</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">名前</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:border-purple-400 focus:outline-none"
                    placeholder="AI社員の名前"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">種族</label>
                  <select
                    value={formData.race}
                    onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                    required
                  >
                    <option value="">選択してください</option>
                    <option value="dragon">ドラゴン 🐲</option>
                    <option value="elf">エルフ 🧝‍♀️</option>
                    <option value="android">アンドロイド 🤖</option>
                    <option value="ghost">ゴースト 👻</option>
                    <option value="mage">メイジ 🧙‍♀️</option>
                    <option value="genius">天才少女 👶</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">性格</label>
                  <select
                    value={formData.personality}
                    onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                    required
                  >
                    <option value="">選択してください</option>
                    <option value="tsundere">ツンデレ</option>
                    <option value="kuudere">クーデレ</option>
                    <option value="genki">元気っ子</option>
                    <option value="yandere">ヤンデレ</option>
                    <option value="oneesan">お姉さんタイプ</option>
                    <option value="imouto">妹タイプ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">専門分野</label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                    required
                  >
                    <option value="">選択してください</option>
                    <option value="sales">営業・セールス 💼</option>
                    <option value="marketing">マーケティング 📱</option>
                    <option value="support">カスタマーサポート 🛡️</option>
                    <option value="analysis">データ分析 📊</option>
                    <option value="secretary">秘書・アシスタント 📋</option>
                    <option value="strategy">戦略・企画 🎯</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 外見設定 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">外見設定</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">髪色</label>
                  <select
                    value={formData.appearance.hairColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, hairColor: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <option value="black">黒髪</option>
                    <option value="brown">茶髪</option>
                    <option value="blonde">金髪</option>
                    <option value="silver">銀髪</option>
                    <option value="blue">青髪</option>
                    <option value="red">赤髪</option>
                    <option value="purple">紫髪</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">瞳色</label>
                  <select
                    value={formData.appearance.eyeColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, eyeColor: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <option value="brown">茶色</option>
                    <option value="black">黒色</option>
                    <option value="blue">青色</option>
                    <option value="green">緑色</option>
                    <option value="red">赤色</option>
                    <option value="purple">紫色</option>
                    <option value="gold">金色</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 説明 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">詳細説明</h2>
              
              <textarea
                value={formData.backstory}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:border-purple-400 focus:outline-none resize-none"
                rows={4}
                placeholder="キャラクターの詳細な背景（任意）"
              />
            </div>

            {/* 保存ボタン */}
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4"
            >
              {isSaving ? '保存中...' : '変更を保存'}
            </button>
          </form>

          {/* 削除ボタン */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="bg-red-500/10 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
              <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ 危険な操作</h3>
              <p className="text-white/80 text-sm mb-4">
                このキャラクターを完全に削除します。すべての会話履歴と関連データも削除され、この操作は取り消せません。
              </p>
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '削除中...' : `「${character?.name || 'キャラクター'}」を完全に削除`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}