'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import BillingStatus from './BillingStatus';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightComponent?: ReactNode;
  showBillingStatus?: boolean;
}

export function PageHeader({ title, onBack, rightComponent, showBillingStatus = true }: PageHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/20">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ←
            </button>
          )}
          <h1 className="text-lg font-bold text-white drop-shadow-lg">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 課金情報表示（ログイン済みの場合のみ） */}
          {session && showBillingStatus && (
            <BillingStatus className="text-white" />
          )}
          
          {rightComponent && (
            <div>
              {rightComponent}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}