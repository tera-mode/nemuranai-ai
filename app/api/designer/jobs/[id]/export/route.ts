import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getDesignJob, getJobArtifacts } from '@/lib/design-actions';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import JSZip from 'jszip';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const job = await getDesignJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get artifacts for this job
    const artifacts = await getJobArtifacts(jobId);
    
    if (artifacts.length === 0) {
      return NextResponse.json({ error: 'No artifacts found' }, { status: 404 });
    }

    // Create ZIP file
    const zip = new JSZip();
    
    // Add job metadata
    const jobMetadata = {
      jobId: job.id,
      useCase: job.useCase,
      createdAt: job.createdAt,
      status: job.status,
      brief: job.brief
    };
    zip.file('job_metadata.json', JSON.stringify(jobMetadata, null, 2));

    // Download and add artifacts to ZIP
    for (let i = 0; i < artifacts.length; i++) {
      const artifact = artifacts[i];
      
      try {
        // Fetch the file from Firebase Storage
        const response = await fetch(artifact.previewUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const extension = artifact.storagePath.split('.').pop() || 'png';
          zip.file(`artifact_${i + 1}.${extension}`, arrayBuffer);
        }
      } catch (error) {
        console.error(`Failed to download artifact ${artifact.id}:`, error);
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="design_job_${jobId.slice(-6)}.zip"`
      }
    });

  } catch (error) {
    console.error('Error exporting job artifacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}