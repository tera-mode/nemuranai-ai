'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightComponent?: ReactNode;
}

export function PageHeader({ title, onBack, rightComponent }: PageHeaderProps) {
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
        
        {rightComponent && (
          <div>
            {rightComponent}
          </div>
        )}
      </div>
    </header>
  );
}