import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminUser } from '@/lib/debug-auth';
import { isAdminSDKAvailable } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Firebase Storage の統計情報を取得
    let totalFiles = 0;
    let characterImages = 0;
    let designImages = 0;
    let recentFiles: Array<{ name: string; size: string; updated: string; type: string; }> = [];
    const adminSdkAvailable = isAdminSDKAvailable();

    try {
      if (adminSdkAvailable) {
        // Admin SDK の利用可能性を確認
        const { adminStorage } = await import('@/lib/firebase-admin');
        
        if (adminStorage) {
          const bucket = adminStorage.bucket();
          
          // ファイル一覧を取得（最大100件）
          const [files] = await bucket.getFiles({ maxResults: 100 });
          totalFiles = files.length;

          // ファイル分類とメタデータ取得
          const fileDetails = await Promise.all(
            files.slice(0, 10).map(async (file) => {
              try {
                const [metadata] = await file.getMetadata();
                const isCharacterImage = file.name.includes('character-images/');
                const isDesignImage = file.name.includes('design-images/');
                
                if (isCharacterImage) characterImages++;
                if (isDesignImage) designImages++;

                return {
                  name: file.name,
                  size: metadata.size ? `${(parseInt(metadata.size) / 1024).toFixed(1)} KB` : 'Unknown',
                  updated: metadata.updated || 'Unknown',
                  type: isCharacterImage ? 'Character' : isDesignImage ? 'Design' : 'Other'
                };
              } catch (error) {
                return {
                  name: file.name,
                  size: 'Unknown',
                  updated: 'Unknown',
                  type: 'Unknown'
                };
              }
            })
          );

          recentFiles = fileDetails;
          
          // 全ファイルの分類カウント（簡易版）
          characterImages = files.filter(f => f.name.includes('character-images/')).length;
          designImages = files.filter(f => f.name.includes('design-images/')).length;
        }
      } else {
        console.warn('Firebase Admin SDK not available - using fallback mode');
      }
    } catch (error) {
      console.error('Storage debug error:', error);
    }

    return NextResponse.json({
      success: true,
      adminSdkAvailable,
      totalFiles,
      characterImages,
      designImages,
      recentFiles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Storage debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch storage information',
        adminSdkAvailable: false,
        totalFiles: 0,
        characterImages: 0,
        designImages: 0,
        recentFiles: []
      },
      { status: 500 }
    );
  }
}