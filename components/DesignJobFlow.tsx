'use client';

import { useState, useEffect } from 'react';
import { AICharacter } from '@/types/database';
import { DesignJob, Brand, UseCase, AutonomyLevel, JobStatus } from '@/types/design';

interface DesignJobFlowProps {
  character: AICharacter;
  useCase: UseCase;
  brief: string;
  onClose: () => void;
  onJobCreated: (jobId: string) => void;
}

export function DesignJobFlow({ character, useCase, brief, onClose, onJobCreated }: DesignJobFlowProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [autonomy, setAutonomy] = useState<AutonomyLevel>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);

  // Brand creation form state
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandPalette, setNewBrandPalette] = useState(['#0066cc', '#ffffff', '#333333']);
  const [newBrandFonts, setNewBrandFonts] = useState(['Arial', 'Helvetica']);
  const [newBrandTone, setNewBrandTone] = useState('professional');

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/designer/brands');
      if (response.ok) {
        const userBrands = await response.json();
        setBrands(userBrands);
        if (userBrands.length === 0) {
          setShowBrandForm(true);
        }
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/designer/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBrandName,
          styleTokens: {
            palette: newBrandPalette.filter(color => color.trim()),
            fonts: newBrandFonts.filter(font => font.trim()),
            tone: newBrandTone
          }
        }),
      });

      if (response.ok) {
        await loadBrands();
        setShowBrandForm(false);
        // Reset form
        setNewBrandName('');
        setNewBrandPalette(['#0066cc', '#ffffff', '#333333']);
        setNewBrandFonts(['Arial', 'Helvetica']);
        setNewBrandTone('professional');
      }
    } catch (error) {
      console.error('Failed to create brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDesignJob = async () => {
    if (!selectedBrand) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/designer/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrand,
          useCase,
          brief,
          autonomy
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onJobCreated(data.jobId);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create design job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUseCaseLabel = (useCase: UseCase): string => {
    const labels: Record<UseCase, string> = {
      logo: 'ロゴデザイン',
      hero_bg: 'ヒーロー背景',
      social_banner: 'SNSバナー',
      ad_creative: '広告クリエイティブ',
      product_kv: '商品キービジュアル'
    };
    return labels[useCase];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {getUseCaseLabel(useCase)}を作成
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {showBrandForm ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">新しいブランドを作成</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                ブランド名
              </label>
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: マイカンパニー"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                ブランドカラー
              </label>
              <div className="flex gap-2">
                {newBrandPalette.map((color, index) => (
                  <input
                    key={index}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newPalette = [...newBrandPalette];
                      newPalette[index] = e.target.value;
                      setNewBrandPalette(newPalette);
                    }}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                トーン
              </label>
              <select
                value={newBrandTone}
                onChange={(e) => setNewBrandTone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="professional">プロフェッショナル</option>
                <option value="friendly">フレンドリー</option>
                <option value="luxury">ラグジュアリー</option>
                <option value="playful">遊び心のある</option>
                <option value="minimalist">ミニマル</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={createBrand}
                disabled={!newBrandName.trim() || isLoading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '作成中...' : 'ブランドを作成'}
              </button>
              {brands.length > 0 && (
                <button
                  onClick={() => setShowBrandForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                ブランドを選択
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">ブランドを選択してください</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowBrandForm(true)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-800"
              >
                + 新しいブランドを作成
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                自動化レベル
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="propose"
                    checked={autonomy === 'propose'}
                    onChange={(e) => setAutonomy(e.target.value as AutonomyLevel)}
                    className="mr-2"
                  />
                  <span className="text-sm">案を提案（承認が必要）</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="auto"
                    checked={autonomy === 'auto'}
                    onChange={(e) => setAutonomy(e.target.value as AutonomyLevel)}
                    className="mr-2"
                  />
                  <span className="text-sm">自動実行</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                デザイン要求
              </label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{brief}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={createDesignJob}
                disabled={!selectedBrand || isLoading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '作成中...' : 'デザインジョブを作成'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}