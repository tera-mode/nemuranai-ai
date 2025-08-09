'use client';

import { useState, useEffect } from 'react';
import { DesignJob, Artifact, UseCase } from '@/types/design';

interface FineTuningPanelProps {
  job: DesignJob;
  artifacts: Artifact[];
  onRegenerateRequest: (params: any) => void;
  onExport: () => void;
}

export function FineTuningPanel({ job, artifacts, onRegenerateRequest, onExport }: FineTuningPanelProps) {
  const [tuningParams, setTuningParams] = useState<Record<string, any>>({});
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    // Initialize tuning parameters based on job type
    initializeTuningParams();
    if (artifacts.length > 0) {
      setSelectedArtifact(artifacts[0]);
    }
  }, [job, artifacts]);

  const initializeTuningParams = () => {
    if (job.useCase === 'logo') {
      setTuningParams({
        colorIntensity: 0.5,
        styleVariation: 0.3,
        symbolComplexity: 0.4,
        textWeight: 0.6,
        modernness: 0.5
      });
    } else if (job.useCase === 'hero_bg') {
      setTuningParams({
        atmosphereIntensity: 0.5,
        colorSaturation: 0.6,
        detailLevel: 0.4,
        lightingMood: 0.5,
        compositionBalance: 0.5
      });
    }
  };

  const handleParameterChange = (param: string, value: number) => {
    setTuningParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const getParameterLabel = (param: string): string => {
    const labels: Record<string, string> = {
      // Logo parameters
      colorIntensity: 'カラー強度',
      styleVariation: 'スタイル変化',
      symbolComplexity: 'シンボル複雑度',
      textWeight: 'テキスト太さ',
      modernness: 'モダンさ',
      // Hero background parameters
      atmosphereIntensity: '雰囲気の強度',
      colorSaturation: '色彩の鮮やかさ',
      detailLevel: '詳細レベル',
      lightingMood: 'ライティング',
      compositionBalance: '構図バランス'
    };
    return labels[param] || param;
  };

  const handleRegenerate = () => {
    const regenerationParams = {
      ...tuningParams,
      baseArtifactId: selectedArtifact?.id,
      jobId: job.id
    };
    onRegenerateRequest(regenerationParams);
  };

  return (
    <div className="bg-white rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">微調整とエクスポート</h3>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          📦 ZIPでエクスポート
        </button>
      </div>

      {/* Artifact Selection */}
      {artifacts.length > 1 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">ベースアーティファクト選択</h4>
          <div className="grid grid-cols-3 gap-3">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                onClick={() => setSelectedArtifact(artifact)}
                className={`aspect-square rounded-lg border-2 cursor-pointer overflow-hidden ${
                  selectedArtifact?.id === artifact.id
                    ? 'border-purple-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={artifact.previewUrl}
                  alt="Artifact"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parameter Controls */}
      <div className="flex-1 space-y-4">
        <h4 className="font-medium text-gray-700">パラメーター調整</h4>
        
        {Object.entries(tuningParams).map(([param, value]) => (
          <div key={param} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600">
                {getParameterLabel(param)}
              </label>
              <span className="text-sm text-gray-500">
                {Math.round(value * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={value}
              onChange={(e) => handleParameterChange(param, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        ))}
      </div>

      {/* Regeneration Controls */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="preserveColors"
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded"
            />
            <label htmlFor="preserveColors" className="text-sm text-gray-600">
              色合いを保持
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="preserveLayout"
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded"
            />
            <label htmlFor="preserveLayout" className="text-sm text-gray-600">
              レイアウトを保持
            </label>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={!selectedArtifact}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          🎨 微調整して再生成
        </button>

        <div className="mt-3 text-xs text-gray-500 text-center">
          パラメーターを調整して、より理想に近いデザインを生成
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}