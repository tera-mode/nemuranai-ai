import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getDesignJob, updateDesignJobStatus, getJobArtifacts, getBrand, deleteDesignJob } from '@/lib/design-actions';
import { jobExecutor } from '@/lib/job-executor';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const job = await getDesignJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get artifacts for this job
    const artifacts = await getJobArtifacts(jobId);

    return NextResponse.json({
      ...job,
      artifacts
    });

  } catch (error) {
    console.error('Error fetching design job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const { status, action } = await request.json();

    const job = await getDesignJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'approve' && job.status === 'need_approval') {
      await updateDesignJobStatus(jobId, 'approved');
      return NextResponse.json({ message: 'Job approved' });
    }

    if (action === 'reject' && job.status === 'need_approval') {
      await updateDesignJobStatus(jobId, 'rejected');
      return NextResponse.json({ message: 'Job rejected' });
    }

    if (action === 'execute' && (job.status === 'approved' || job.status === 'failed')) {
      await updateDesignJobStatus(jobId, 'queued');
      
      // Execute job in background
      const brand = await getBrand(job.brandId);
      if (brand) {
        executeJobInBackground(jobId, brand);
      }
      
      return NextResponse.json({ message: 'Job execution started' });
    }

    // Direct status update
    if (status) {
      await updateDesignJobStatus(jobId, status);
      return NextResponse.json({ message: 'Status updated' });
    }

    return NextResponse.json({ error: 'Invalid action or status' }, { status: 400 });

  } catch (error) {
    console.error('Error updating design job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    
    const job = await getDesignJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the job and its related data
    await deleteDesignJob(jobId);
    
    return NextResponse.json({ message: 'Job deleted successfully' });

  } catch (error) {
    console.error('Error deleting design job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function executeJobInBackground(jobId: string, brand: any) {
  process.nextTick(async () => {
    try {
      const job = await getDesignJob(jobId);
      if (job) {
        await jobExecutor.executeJob(job, brand);
      }
    } catch (error) {
      console.error(`Background job execution failed for ${jobId}:`, error);
    }
  });
}

