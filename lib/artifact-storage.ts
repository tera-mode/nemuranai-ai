// Artifact Storage - 成果物保存システム

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Artifact, PutArtifactParams } from '@/lib/runner-types';

// UUID生成（既存パターンと同じ）
function generateUuid(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// SHA256ハッシュ生成（簡易版）
function generateHash(content: string): string {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(16);
}

export class ArtifactStorage {
  // アーティファクト保存
  static async putArtifact(params: PutArtifactParams): Promise<{
    artifact_id: string;
    url: string;
    hash: string;
  }> {
    try {
      const artifactId = `artifact_${generateUuid()}`;
      const hash = generateHash(params.content);
      const encoding = params.encoding || 'utf-8';
      
      console.log(`💾 Storing artifact: ${artifactId} (${params.type})`);

      // Firestore に保存
      const artifactData: Omit<Artifact, 'id'> = {
        type: params.type,
        content: params.content,
        encoding,
        hash,
        meta: params.meta || {},
        created_at: new Date()
      };

      const docRef = await addDoc(collection(db, 'artifacts'), {
        id: artifactId,
        ...artifactData
      });

      // URL生成（簡易版 - 実際は signed URL等を使用）
      const url = `/api/artifacts/${artifactId}`;

      console.log(`✅ Artifact stored: ${artifactId}`);
      
      return {
        artifact_id: artifactId,
        url,
        hash
      };

    } catch (error) {
      console.error('❌ Put artifact error:', error);
      throw new Error(`Failed to store artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // アーティファクト取得
  static async getArtifact(artifactId: string): Promise<Artifact | null> {
    try {
      console.log(`📄 Retrieving artifact: ${artifactId}`);

      const q = query(
        collection(db, 'artifacts'),
        where('id', '==', artifactId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn(`⚠️ Artifact not found: ${artifactId}`);
        return null;
      }

      const docData = querySnapshot.docs[0].data();
      const artifact: Artifact = {
        id: docData.id,
        type: docData.type,
        content: docData.content,
        encoding: docData.encoding,
        hash: docData.hash,
        meta: docData.meta || {},
        created_at: docData.created_at instanceof Timestamp 
          ? docData.created_at.toDate() 
          : docData.created_at
      };

      console.log(`✅ Artifact retrieved: ${artifactId}`);
      return artifact;

    } catch (error) {
      console.error('❌ Get artifact error:', error);
      throw new Error(`Failed to retrieve artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // アーティファクト内容取得
  static async getArtifactContent(artifactId: string): Promise<string | null> {
    const artifact = await this.getArtifact(artifactId);
    return artifact ? artifact.content : null;
  }

  // 複数アーティファクト取得
  static async getArtifacts(artifactIds: string[]): Promise<Record<string, Artifact>> {
    const artifacts: Record<string, Artifact> = {};
    
    for (const id of artifactIds) {
      const artifact = await this.getArtifact(id);
      if (artifact) {
        artifacts[id] = artifact;
      }
    }
    
    return artifacts;
  }

  // アーティファクト存在チェック
  static async exists(artifactId: string): Promise<boolean> {
    try {
      const artifact = await this.getArtifact(artifactId);
      return artifact !== null;
    } catch {
      return false;
    }
  }

  // アーティファクト削除
  static async deleteArtifact(artifactId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting artifact: ${artifactId}`);

      const q = query(
        collection(db, 'artifacts'),
        where('id', '==', artifactId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn(`⚠️ Artifact not found for deletion: ${artifactId}`);
        return false;
      }

      // TODO: 実際の削除処理（論理削除を推奨）
      await updateDoc(querySnapshot.docs[0].ref, {
        deleted_at: new Date()
      });

      console.log(`✅ Artifact deleted: ${artifactId}`);
      return true;

    } catch (error) {
      console.error('❌ Delete artifact error:', error);
      return false;
    }
  }

  // 実行用アーティファクト一覧取得
  static async getRunArtifacts(runId: string): Promise<Record<string, Artifact>> {
    try {
      const q = query(
        collection(db, 'artifacts'),
        where('meta.run_id', '==', runId)
      );
      
      const querySnapshot = await getDocs(q);
      const artifacts: Record<string, Artifact> = {};

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        artifacts[data.id] = {
          id: data.id,
          type: data.type,
          content: data.content,
          encoding: data.encoding,
          hash: data.hash,
          meta: data.meta,
          created_at: data.created_at instanceof Timestamp 
            ? data.created_at.toDate() 
            : data.created_at
        };
      });

      return artifacts;

    } catch (error) {
      console.error('❌ Get run artifacts error:', error);
      return {};
    }
  }

  // 一時的な内容から即座にアーティファクト作成
  static async createTextArtifact(content: string, type: 'json' | 'md' | 'txt' | 'csv' = 'txt', meta?: Record<string, any>): Promise<string> {
    const result = await this.putArtifact({
      type,
      content,
      encoding: 'utf-8',
      meta
    });
    
    return result.artifact_id;
  }

  // JSON データ保存
  static async createJsonArtifact(data: any, meta?: Record<string, any>): Promise<string> {
    return await this.createTextArtifact(
      JSON.stringify(data, null, 2),
      'json',
      meta
    );
  }

  // マークダウンレポート保存
  static async createMarkdownArtifact(markdown: string, meta?: Record<string, any>): Promise<string> {
    return await this.createTextArtifact(
      markdown,
      'md',
      meta
    );
  }

  // CSV データ保存
  static async createCsvArtifact(csvData: string, meta?: Record<string, any>): Promise<string> {
    return await this.createTextArtifact(
      csvData,
      'csv',
      meta
    );
  }

  // アーティファクト統計情報
  static async getStorageStats(): Promise<{
    totalArtifacts: number;
    totalSize: number;
    typeBreakdown: Record<string, number>;
  }> {
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts'));
      
      let totalSize = 0;
      const typeBreakdown: Record<string, number> = {};

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const contentSize = data.content ? data.content.length : 0;
        totalSize += contentSize;
        
        typeBreakdown[data.type] = (typeBreakdown[data.type] || 0) + 1;
      });

      return {
        totalArtifacts: querySnapshot.size,
        totalSize,
        typeBreakdown
      };

    } catch (error) {
      console.error('❌ Get storage stats error:', error);
      return {
        totalArtifacts: 0,
        totalSize: 0,
        typeBreakdown: {}
      };
    }
  }
}