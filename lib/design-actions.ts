import { db } from '@/lib/firebase-client';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { Brand, DesignJob, Artifact, Run, JobStatus } from '@/types/design';

// ブランド操作
export async function createBrand(brand: Omit<Brand, 'id' | 'createdAt'>): Promise<string> {
  try {
    const brandData = {
      ...brand,
      createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, 'brands'), brandData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating brand:', error);
    throw new Error('ブランド作成に失敗しました');
  }
}

export async function getUserBrands(userId: string): Promise<Brand[]> {
  try {
    const q = query(
      collection(db, 'brands'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const brands: Brand[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      
      brands.push({
        id: doc.id,
        ...data,
        createdAt
      } as Brand);
    });
    
    return brands;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

// デザインジョブ操作
export async function createDesignJob(job: Omit<DesignJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const jobData = {
      ...job,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(collection(db, 'design_jobs'), jobData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating design job:', error);
    throw new Error('デザインジョブ作成に失敗しました');
  }
}

export async function getDesignJob(jobId: string): Promise<DesignJob | null> {
  try {
    const docRef = doc(db, 'design_jobs', jobId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : new Date(data.updatedAt);
      
      return {
        id: docSnap.id,
        ...data,
        createdAt,
        updatedAt
      } as DesignJob;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching design job:', error);
    return null;
  }
}

export async function updateDesignJobStatus(jobId: string, status: JobStatus): Promise<void> {
  try {
    const docRef = doc(db, 'design_jobs', jobId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating design job status:', error);
    throw new Error('デザインジョブステータス更新に失敗しました');
  }
}

export async function getUserDesignJobs(userId: string): Promise<DesignJob[]> {
  try {
    const q = query(
      collection(db, 'design_jobs'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const jobs: DesignJob[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : new Date(data.updatedAt);
      
      jobs.push({
        id: doc.id,
        ...data,
        createdAt,
        updatedAt
      } as DesignJob);
    });
    
    return jobs;
  } catch (error) {
    console.error('Error fetching design jobs:', error);
    return [];
  }
}

export async function deleteDesignJob(jobId: string): Promise<void> {
  try {
    // Delete artifacts first
    const artifactsQuery = query(
      collection(db, 'artifacts'),
      where('jobId', '==', jobId)
    );
    const artifactsSnapshot = await getDocs(artifactsQuery);
    const deleteArtifactPromises = artifactsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteArtifactPromises);

    // Delete runs
    const runsQuery = query(
      collection(db, 'runs'),
      where('jobId', '==', jobId)
    );
    const runsSnapshot = await getDocs(runsQuery);
    const deleteRunPromises = runsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteRunPromises);

    // Delete the job itself
    const jobRef = doc(db, 'design_jobs', jobId);
    await deleteDoc(jobRef);
  } catch (error) {
    console.error('Error deleting design job:', error);
    throw new Error('ジョブ削除に失敗しました');
  }
}

// アーティファクト操作
export async function createArtifact(artifact: Omit<Artifact, 'id' | 'createdAt'>): Promise<string> {
  try {
    const artifactData = {
      ...artifact,
      createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, 'artifacts'), artifactData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating artifact:', error);
    throw new Error('アーティファクト作成に失敗しました');
  }
}

export async function getJobArtifacts(jobId: string): Promise<Artifact[]> {
  try {
    const q = query(
      collection(db, 'artifacts'),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const artifacts: Artifact[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      
      artifacts.push({
        id: doc.id,
        ...data,
        createdAt
      } as Artifact);
    });
    
    return artifacts;
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return [];
  }
}

// 実行ログ操作
export async function createRun(run: Omit<Run, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Filter out undefined fields before saving to Firestore
    const runData: any = {
      ...run,
      createdAt: new Date(),
    };
    
    // Remove undefined fields
    Object.keys(runData).forEach(key => {
      if (runData[key] === undefined) {
        delete runData[key];
      }
    });
    
    const docRef = await addDoc(collection(db, 'runs'), runData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating run:', error);
    throw new Error('実行ログ作成に失敗しました');
  }
}

export async function getJobRuns(jobId: string): Promise<Run[]> {
  try {
    const q = query(
      collection(db, 'runs'),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const runs: Run[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      
      runs.push({
        id: doc.id,
        ...data,
        createdAt
      } as Run);
    });
    
    return runs;
  } catch (error) {
    console.error('Error fetching runs:', error);
    return [];
  }
}

export async function getBrand(brandId: string): Promise<Brand | null> {
  try {
    const docRef = doc(db, 'brands', brandId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : new Date(data.createdAt);
      
      return {
        id: docSnap.id,
        ...data,
        createdAt
      } as Brand;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}