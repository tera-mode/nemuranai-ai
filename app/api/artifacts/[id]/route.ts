import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { ArtifactStorage } from '@/lib/artifact-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const artifactId = params.id;
    
    if (!artifactId) {
      return NextResponse.json(
        { error: 'Artifact ID is required' },
        { status: 400 }
      );
    }

    console.log(`📄 Artifact request: ${artifactId}`);

    // アーティファクト取得
    const artifact = await ArtifactStorage.getArtifact(artifactId);
    
    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Content-Typeの決定
    const contentTypes = {
      'json': 'application/json',
      'md': 'text/markdown; charset=utf-8',
      'txt': 'text/plain; charset=utf-8',
      'csv': 'text/csv; charset=utf-8',
      'html': 'text/html; charset=utf-8',
      'png': 'image/png'
    };

    const contentType = contentTypes[artifact.type] || 'text/plain; charset=utf-8';

    // レスポンス作成
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Artifact-ID': artifactId,
      'X-Artifact-Hash': artifact.hash || '',
      'X-Created-At': artifact.created_at.toISOString()
    });

    // Base64エンコードされたコンテンツの場合
    if (artifact.encoding === 'base64') {
      const buffer = Buffer.from(artifact.content, 'base64');
      return new Response(buffer, { headers });
    }

    // テキストコンテンツの場合
    return new Response(artifact.content, { headers });

  } catch (error) {
    console.error('Artifacts API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// アーティファクト情報取得（メタデータのみ）
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(null, { status: 401 });
    }

    const artifactId = params.id;
    const artifact = await ArtifactStorage.getArtifact(artifactId);
    
    if (!artifact) {
      return new Response(null, { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Content-Length': artifact.content.length.toString(),
      'X-Artifact-ID': artifactId,
      'X-Artifact-Type': artifact.type,
      'X-Artifact-Hash': artifact.hash || '',
      'X-Created-At': artifact.created_at.toISOString()
    });

    return new Response(null, { headers });

  } catch (error) {
    console.error('Artifacts HEAD Error:', error);
    return new Response(null, { status: 500 });
  }
}