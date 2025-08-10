import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { deleteImageWithAdmin } from '@/lib/firebase-admin';

// Firebase Storage URLからファイルパスを抽出する関数
function extractFilePathFromStorageUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // パターン1: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?{params}
    let pathMatch = urlObj.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+)/);
    if (pathMatch && pathMatch[1]) {
      const encodedPath = pathMatch[1];
      const decodedPath = decodeURIComponent(encodedPath);
      return decodedPath;
    }
    
    // パターン2: https://storage.googleapis.com/{bucket}/{path}?{params}
    if (urlObj.hostname === 'storage.googleapis.com') {
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2) {
        // 最初の部分はバケット名なので除去
        const filePath = pathParts.slice(1).join('/');
        return filePath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file path from Storage URL:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // リクエストボディを取得
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // URLからファイルパスを抽出
    const filePath = extractFilePathFromStorageUrl(imageUrl);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid Firebase Storage URL' }, { status: 400 });
    }

    console.log(`API: Deleting image at path: ${filePath} for user: ${session.user.email}`);

    // Admin SDKを使用してファイルを削除
    await deleteImageWithAdmin(filePath);

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully',
      filePath 
    });

  } catch (error: any) {
    console.error('Delete image API error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete image',
      details: error.message 
    }, { status: 500 });
  }
}