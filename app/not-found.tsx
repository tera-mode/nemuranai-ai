import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg001.jpg)' }}
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      
      <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">ページが見つかりません</h2>
        <p className="text-white/80 mb-6">お探しのページは存在しないか、移動した可能性があります。</p>
        <Link href="/home" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform">
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}