import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI社員は眠らない',
  description: 'ユーザーが自由にキャラメイクできるAI社員プラットフォーム',
  icons: {
    icon: '/nemuranai-ai_fav.png',
    shortcut: '/nemuranai-ai_fav.png',
    apple: '/nemuranai-ai_fav.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}