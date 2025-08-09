'use client';

import { useState, useEffect } from 'react';
import { DesignJob, JobStatus } from '@/types/design';

interface DesignJobProgressProps {
  jobId: string;
  onJobComplete?: () => void;
}

export function DesignJobProgress({ jobId, onJobComplete }: DesignJobProgressProps) {
  const [job, setJob] = useState<DesignJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobStatus();
    const interval = setInterval(loadJobStatus, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [jobId]);

  const loadJobStatus = async () => {
    try {
      const response = await fetch(`/api/designer/jobs/${jobId}`);
      if (response.ok) {
        const jobData = await response.json();
        setJob(jobData);
        
        // Notify parent when job is complete
        if (jobData.status === 'approved' && onJobComplete) {
          onJobComplete();
        }
      }
    } catch (error) {
      console.error('Failed to load job status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: JobStatus): string => {
    const icons: Record<JobStatus, string> = {
      queued: '⏳',
      running: '🔄',
      need_approval: '✋',
      approved: '✅',
      rejected: '❌',
      failed: '💥'
    };
    return icons[status];
  };

  const getStatusMessage = (status: JobStatus): string => {
    const messages: Record<JobStatus, string> = {
      queued: 'デザイン作業を開始する準備をしています...',
      running: 'AI がデザインを作成中です...',
      need_approval: 'デザインが完成しました！確認してください。',
      approved: 'デザインが承認されました。ダウンロード可能です。',
      rejected: 'デザインが却下されました。',
      failed: 'デザイン作成中にエラーが発生しました。'
    };
    return messages[status];
  };

  const getProgressPercentage = (status: JobStatus): number => {
    const percentages: Record<JobStatus, number> = {
      queued: 10,
      running: 60,
      need_approval: 90,
      approved: 100,
      rejected: 0,
      failed: 0
    };
    return percentages[status];
  };

  if (isLoading) {
    return (
      <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30">
        <div className="text-white text-sm">ジョブステータスを読み込み中...</div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">
          {getStatusIcon(job.status)}
        </div>
        <div className="flex-1">
          <div className="text-white font-medium text-sm">
            デザインジョブ #{jobId.slice(-6)}
          </div>
          <div className="text-white/80 text-xs">
            {getStatusMessage(job.status)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="bg-white/20 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage(job.status)}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {job.status === 'need_approval' && (
        <div className="flex gap-2">
          <button
            onClick={() => updateJobStatus('approve')}
            className="flex-1 bg-green-500/80 hover:bg-green-500 text-white text-xs py-2 px-3 rounded-lg transition-colors"
          >
            承認
          </button>
          <button
            onClick={() => updateJobStatus('reject')}
            className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-xs py-2 px-3 rounded-lg transition-colors"
          >
            却下
          </button>
        </div>
      )}

      {job.status === 'approved' && (
        <button
          onClick={() => window.open('/api/designer/jobs', '_blank')}
          className="w-full bg-purple-500/80 hover:bg-purple-500 text-white text-xs py-2 px-3 rounded-lg transition-colors"
        >
          ダウンロード
        </button>
      )}
    </div>
  );

  async function updateJobStatus(action: string) {
    try {
      const response = await fetch(`/api/designer/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await loadJobStatus();
      }
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }
}