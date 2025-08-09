'use client';

import { useState, useEffect } from 'react';
import { DesignJob, Artifact, JobStatus } from '@/types/design';
import { FineTuningPanel } from '@/components/FineTuningPanel';

interface DesignJobManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DesignJobManager({ isOpen, onClose }: DesignJobManagerProps) {
  const [jobs, setJobs] = useState<DesignJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DesignJob | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFineTuning, setShowFineTuning] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadJobs();
      // Start auto-refresh
      const interval = setInterval(() => {
        // Check current jobs state to decide if refresh is needed
        setJobs(currentJobs => {
          const hasActiveJobs = currentJobs.some(job => job.status === 'queued' || job.status === 'running');
          if (hasActiveJobs) {
            loadJobs();
            setSelectedJob(currentSelected => {
              if (currentSelected && (currentSelected.status === 'queued' || currentSelected.status === 'running')) {
                loadJobDetails(currentSelected.id!);
              }
              return currentSelected;
            });
          }
          return currentJobs;
        });
      }, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    } else {
      // Clear interval when dialog closes
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedJob) {
      loadJobDetails(selectedJob.id!);
    }
  }, [selectedJob]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/designer/jobs');
      if (response.ok) {
        const jobData = await response.json();
        setJobs(jobData);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    try {
      const response = await fetch(`/api/designer/jobs/${jobId}`);
      if (response.ok) {
        const jobDetails = await response.json();
        setArtifacts(jobDetails.artifacts || []);
      }
    } catch (error) {
      console.error('Failed to load job details:', error);
    }
  };

  const updateJobStatus = async (jobId: string, action: string) => {
    try {
      const response = await fetch(`/api/designer/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await loadJobs();
        if (selectedJob?.id === jobId) {
          await loadJobDetails(jobId);
        }
      }
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('このデザインジョブを削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/designer/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
          setArtifacts([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handleExport = async (jobId: string) => {
    try {
      const response = await fetch(`/api/designer/jobs/${jobId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design_job_${jobId.slice(-6)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export job:', error);
    }
  };

  const handleRegenerateRequest = async (params: any) => {
    // In a real implementation, this would trigger a new design job
    // with the fine-tuning parameters
    console.log('Regenerate with params:', params);
    // For now, just close the fine-tuning panel
    setShowFineTuning(false);
  };

  const getStatusColor = (status: JobStatus): string => {
    const colors: Record<JobStatus, string> = {
      queued: 'bg-yellow-500',
      running: 'bg-blue-500',
      need_approval: 'bg-orange-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
      failed: 'bg-red-600'
    };
    return colors[status];
  };

  const getStatusLabel = (status: JobStatus): string => {
    const labels: Record<JobStatus, string> = {
      queued: '待機中',
      running: '実行中',
      need_approval: '承認待ち',
      approved: '承認済み',
      rejected: '却下',
      failed: '失敗'
    };
    return labels[status];
  };

  const getUseCaseLabel = (useCase: string): string => {
    const labels: Record<string, string> = {
      logo: 'ロゴデザイン',
      hero_bg: 'ヒーロー背景',
      social_banner: 'SNSバナー',
      ad_creative: '広告クリエイティブ',
      product_kv: '商品キービジュアル'
    };
    return labels[useCase] || useCase;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      {/* Left Panel - Job List */}
      <div className="w-1/3 bg-white h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">デザインジョブ</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadJobs}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              title="更新"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">🎨</div>
              <p>まだデザインジョブがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedJob?.id === job.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="font-medium text-gray-800 cursor-pointer flex-1"
                      onClick={() => setSelectedJob(job)}
                    >
                      {getUseCaseLabel(job.useCase)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJob(job.id!);
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded text-xs"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div 
                    className="text-sm text-gray-600 truncate cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    {typeof job.brief === 'object' && 'text' in job.brief 
                      ? job.brief.text 
                      : typeof job.brief === 'string' 
                        ? job.brief 
                        : 'デザイン要求'}
                  </div>
                  <div 
                    className="text-xs text-gray-400 mt-1 cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    {new Date(job.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Job Details or Fine Tuning */}
      <div className="flex-1 bg-gray-50 h-full flex flex-col">
        {showFineTuning && selectedJob && artifacts.length > 0 ? (
          <div className="h-full p-6">
            <FineTuningPanel
              job={selectedJob}
              artifacts={artifacts}
              onRegenerateRequest={handleRegenerateRequest}
              onExport={() => handleExport(selectedJob.id!)}
            />
            <button
              onClick={() => setShowFineTuning(false)}
              className="mt-4 w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              戻る
            </button>
          </div>
        ) : selectedJob ? (
          <>
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {getUseCaseLabel(selectedJob.useCase)}
                  </h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm text-white mt-2 ${getStatusColor(selectedJob.status)}`}>
                    {getStatusLabel(selectedJob.status)}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {selectedJob.status === 'need_approval' && (
                    <>
                      <button
                        onClick={() => updateJobStatus(selectedJob.id!, 'approve')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => updateJobStatus(selectedJob.id!, 'reject')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        却下
                      </button>
                    </>
                  )}
                  {selectedJob.status === 'approved' && (
                    <button
                      onClick={() => updateJobStatus(selectedJob.id!, 'execute')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      実行
                    </button>
                  )}
                  {selectedJob.status === 'failed' && (
                    <button
                      onClick={() => updateJobStatus(selectedJob.id!, 'execute')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      再実行
                    </button>
                  )}
                  {(selectedJob.status === 'approved' || selectedJob.status === 'need_approval') && artifacts.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowFineTuning(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        微調整
                      </button>
                      <button
                        onClick={() => handleExport(selectedJob.id!)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        エクスポート
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">デザイン要求</h4>
                <p className="text-gray-600 text-sm">
                  {typeof selectedJob.brief === 'object' && 'text' in selectedJob.brief 
                    ? selectedJob.brief.text 
                    : typeof selectedJob.brief === 'string' 
                      ? selectedJob.brief 
                      : JSON.stringify(selectedJob.brief, null, 2)}
                </p>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <h4 className="font-medium text-gray-700 mb-4">生成されたアーティファクト</h4>
              
              {artifacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">
                    {selectedJob.status === 'queued' ? '⏳' : 
                     selectedJob.status === 'running' ? '🔄' : 
                     selectedJob.status === 'failed' ? '❌' : '📄'}
                  </div>
                  <p>
                    {selectedJob.status === 'queued' ? 'ジョブは待機中です...' :
                     selectedJob.status === 'running' ? 'デザインを生成中です...' :
                     selectedJob.status === 'failed' ? 'ジョブの実行に失敗しました' :
                     'まだアーティファクトがありません'}
                  </p>
                  {selectedJob.status === 'queued' || selectedJob.status === 'running' ? (
                    <div className="flex items-center justify-center mt-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      <span className="ml-2 text-sm">処理中...</span>
                    </div>
                  ) : null}
                  {selectedJob.status === 'failed' && (
                    <button
                      onClick={() => loadJobDetails(selectedJob.id!)}
                      className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      再読み込み
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      {artifact.type === 'image' && (
                        <>
                          <div className="aspect-video bg-gray-100">
                            <img
                              src={artifact.previewUrl}
                              alt="Generated artifact"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <div className="text-sm text-gray-600 mb-2">
                              {artifact.w} × {artifact.h} px
                            </div>
                            <a
                              href={artifact.previewUrl}
                              download
                              className="block w-full text-center py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                            >
                              ダウンロード
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">👈</div>
              <p>ジョブを選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}