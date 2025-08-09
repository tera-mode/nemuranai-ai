'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const menuItems = [
    {
      icon: '✨',
      label: '新しいAI社員を作成',
      onClick: () => {
        router.push('/create-character');
        setIsOpen(false);
      }
    },
    {
      icon: '👤',
      label: 'マイページ',
      onClick: () => {
        // TODO: マイページ実装
        console.log('マイページ');
        setIsOpen(false);
      }
    },
    {
      icon: '⚙️',
      label: '設定',
      onClick: () => {
        // TODO: 設定画面実装
        console.log('設定');
        setIsOpen(false);
      }
    },
    {
      icon: '👥',
      label: '友達紹介',
      onClick: () => {
        // TODO: 友達紹介実装
        console.log('友達紹介');
        setIsOpen(false);
      }
    },
    {
      icon: '🚪',
      label: 'ログアウト',
      onClick: () => {
        signOut();
        setIsOpen(false);
      }
    }
  ];

  return (
    <div className="relative z-[100]">
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/30 hover:bg-white/30 transition-colors relative z-[100]"
      >
        <div className="w-6 h-6 flex flex-col justify-center gap-1">
          <div className={`h-0.5 bg-white transition-transform ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`h-0.5 bg-white transition-opacity ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`h-0.5 bg-white transition-transform ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {/* メニュー */}
      {isOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div 
            className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* メニューコンテンツ */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-md rounded-xl border border-white/20 z-[110] overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}