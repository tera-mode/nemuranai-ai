'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCharacterById, updateCharacter, deleteCharacter } from '@/lib/character-actions';
import { AICharacter, CharacterRace, CharacterGender, CharacterAge, SkinTone, PersonalityType, BusinessDomain } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { getRaceLabel, getGenderLabel, getAgeLabel, getSkinToneLabel, getPersonalityLabel, getDomainLabel, getThemeColorOptions } from '@/lib/translations';

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
    gender: 'female' as CharacterGender,
    race: 'human' as CharacterRace,
    age: 'adult' as CharacterAge,
    skinTone: 'medium' as SkinTone,
    personality: 'genki' as PersonalityType,
    domain: 'secretary' as BusinessDomain,
    backstory: '',
    appearance: {
      themeColor: '#4ecdc4',
      outfit: 'business',
      accessories: []
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
          gender: characterData.gender || 'female',
          race: characterData.race,
          age: characterData.age || 'adult',
          skinTone: characterData.skinTone || 'medium',
          personality: characterData.personality,
          domain: characterData.domain,
          backstory: characterData.backstory || '',
          appearance: {
            themeColor: characterData.appearance?.themeColor || '#4ecdc4',
            outfit: characterData.appearance?.outfit || 'business',
            accessories: characterData.appearance?.accessories || []
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
        gender: formData.gender,
        race: formData.race,
        age: formData.age,
        skinTone: formData.skinTone,
        personality: formData.personality,
        domain: formData.domain,
        backstory: formData.backstory,
        appearance: formData.appearance
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">性別</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as CharacterGender }))}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                      required
                    >
                      <option value="male">{getGenderLabel('male')}</option>
                      <option value="female">{getGenderLabel('female')}</option>
                      <option value="non-binary">{getGenderLabel('non-binary')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">年齢層</label>
                    <select
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value as CharacterAge }))}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                      required
                    >
                      <option value="young">{getAgeLabel('young')}</option>
                      <option value="adult">{getAgeLabel('adult')}</option>
                      <option value="elder">{getAgeLabel('elder')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">タイプ</label>
                  <select
                    value={formData.race}
                    onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value as CharacterRace }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                    required
                  >
                    <option value="human">{getRaceLabel('human')}</option>
                    <option value="dog">{getRaceLabel('dog')}</option>
                    <option value="cat">{getRaceLabel('cat')}</option>
                    <option value="dragon">{getRaceLabel('dragon')}</option>
                    <option value="elf">{getRaceLabel('elf')}</option>
                    <option value="android">{getRaceLabel('android')}</option>
                    <option value="ghost">{getRaceLabel('ghost')}</option>
                    <option value="mage">{getRaceLabel('mage')}</option>
                    <option value="knight">{getRaceLabel('knight')}</option>
                    <option value="ninja">{getRaceLabel('ninja')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">肌の色</label>
                  <select
                    value={formData.skinTone}
                    onChange={(e) => setFormData(prev => ({ ...prev, skinTone: e.target.value as SkinTone }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                    required
                  >
                    <option value="pinkish">{getSkinToneLabel('pinkish')}</option>
                    <option value="fair">{getSkinToneLabel('fair')}</option>
                    <option value="light">{getSkinToneLabel('light')}</option>
                    <option value="medium">{getSkinToneLabel('medium')}</option>
                    <option value="olive">{getSkinToneLabel('olive')}</option>
                    <option value="brown">{getSkinToneLabel('brown')}</option>
                    <option value="dark">{getSkinToneLabel('dark')}</option>
                    <option value="deep">{getSkinToneLabel('deep')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 性格と専門分野 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">性格と専門分野</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">性格</label>
                  <select
                    value={formData.personality}
                    onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value as PersonalityType }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                    required
                  >
                    <option value="tsundere">{getPersonalityLabel('tsundere')}</option>
                    <option value="kuudere">{getPersonalityLabel('kuudere')}</option>
                    <option value="genki">{getPersonalityLabel('genki')}</option>
                    <option value="yandere">{getPersonalityLabel('yandere')}</option>
                    <option value="oneesan">{getPersonalityLabel('oneesan')}</option>
                    <option value="imouto">{getPersonalityLabel('imouto')}</option>
                    <option value="landmine">{getPersonalityLabel('landmine')}</option>
                    <option value="wild">{getPersonalityLabel('wild')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">専門分野</label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value as BusinessDomain }))}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-400 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                    required
                  >
                    <option value="sales">{getDomainLabel('sales')}</option>
                    <option value="marketing">{getDomainLabel('marketing')}</option>
                    <option value="support">{getDomainLabel('support')}</option>
                    <option value="analysis">{getDomainLabel('analysis')}</option>
                    <option value="secretary">{getDomainLabel('secretary')}</option>
                    <option value="strategy">{getDomainLabel('strategy')}</option>
                    <option value="designer">{getDomainLabel('designer')}</option>
                    <option value="writer">{getDomainLabel('writer')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 外見設定 */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 drop-shadow-lg">外見設定</h2>
              
              <div>
                <label className="block text-white/90 text-sm font-medium mb-3">テーマカラー</label>
                <div className="grid grid-cols-4 gap-3">
                  {getThemeColorOptions().map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, themeColor: color.value }
                      }))}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        formData.appearance.themeColor === color.value
                          ? 'border-white bg-white/20'
                          : 'border-white/30 bg-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-white text-xs">{color.label}</span>
                    </button>
                  ))}
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