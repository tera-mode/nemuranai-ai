import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createDesignJob, getUserDesignJobs, getDesignJob, getBrand } from '@/lib/design-actions';
import { JobCreationRequest, JobCreationResponse } from '@/types/design';
import { jobExecutor } from '@/lib/job-executor';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: JobCreationRequest = await request.json();
    const { brandId, useCase, brief, autonomy } = body;

    // Validate request
    if (!brandId || !useCase || !brief || !autonomy) {
      return NextResponse.json(
        { error: 'Missing required fields: brandId, useCase, brief, autonomy' },
        { status: 400 }
      );
    }

    // Get brand to verify ownership
    const brand = await getBrand(brandId);
    if (!brand || brand.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Convert natural language brief to structured brief using Claude
    const structuredBrief = await convertBriefToStructured(brief, useCase);

    // Create design job
    const jobId = await createDesignJob({
      brandId,
      useCase,
      brief: structuredBrief,
      status: 'queued',
      autonomy,
      variantIds: [],
      createdBy: session.user.id
    });

    // Execute job asynchronously (in background)
    console.log(`Job created with autonomy: ${autonomy}, jobId: ${jobId}`);
    if (autonomy === 'auto') {
      console.log('Calling executeJobInBackground...');
      executeJobInBackground(jobId, brand);
    } else {
      console.log('Skipping auto-execution because autonomy is not "auto"');
    }

    const response: JobCreationResponse = {
      jobId,
      status: autonomy === 'auto' ? 'queued' : 'need_approval',
      briefSummary: structuredBrief
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating design job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await getUserDesignJobs(session.user.id);
    return NextResponse.json(jobs);

  } catch (error) {
    console.error('Error fetching design jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function convertBriefToStructured(brief: string, useCase: string) {
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeApiKey) {
    throw new Error('Claude API key not configured');
  }

  let systemPrompt = '';
  let exampleOutput = {};

  if (useCase === 'logo') {
    systemPrompt = `Extract logo design parameters from the brief. Return JSON with: layout ('wide'|'square'|'tall'), twoLine (boolean), text (company name), vibe ('bright'|'fantasy'|'professional'|'playful'), palette (array of colors), textMode ('overlay'|'side'|'bottom'), symbolHint (description of desired symbol/icon).`;
    exampleOutput = {
      layout: 'wide',
      twoLine: false,
      text: 'Company Name',
      vibe: 'professional',
      palette: ['#0066cc', '#ffffff'],
      textMode: 'side',
      symbolHint: 'modern geometric shape'
    };
  } else if (useCase === 'hero_bg') {
    systemPrompt = `Extract hero background parameters from the brief. Return JSON with: theme ('bright_fantasy_office'|'professional'|'creative'|'tech'), elements (array of desired elements), avoid (array of things to avoid), aspectRatio ('16:9'|'21:9'|'4:3'|'square').`;
    exampleOutput = {
      theme: 'professional',
      elements: ['office space', 'modern furniture'],
      avoid: ['people', 'clutter'],
      aspectRatio: '16:9'
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        system: `${systemPrompt}\n\nExample output format: ${JSON.stringify(exampleOutput, null, 2)}\n\nReturn only valid JSON, no additional text.`,
        messages: [
          {
            role: 'user',
            content: brief
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to extract JSON from Claude response');

  } catch (error) {
    console.error('Error converting brief:', error);
    
    // Fallback to default values
    if (useCase === 'logo') {
      return {
        layout: 'wide',
        twoLine: false,
        text: brief.slice(0, 50),
        vibe: 'professional',
        palette: ['#0066cc', '#ffffff'],
        textMode: 'side',
        symbolHint: brief.slice(0, 100)
      };
    } else if (useCase === 'hero_bg') {
      return {
        theme: 'professional',
        elements: [brief.slice(0, 50)],
        avoid: ['clutter', 'text'],
        aspectRatio: '16:9'
      };
    }
    
    throw error;
  }
}

async function executeJobInBackground(jobId: string, brand: any) {
  // Execute in the next tick to avoid blocking the response
  process.nextTick(async () => {
    try {
      console.log(`Starting background execution for job ${jobId}`);
      const job = await getDesignJob(jobId);
      if (job) {
        console.log(`Job found, executing:`, job);
        await jobExecutor.executeJob(job, brand);
        console.log(`Job ${jobId} execution completed`);
      } else {
        console.error(`Job ${jobId} not found for background execution`);
      }
    } catch (error) {
      console.error(`Background job execution failed for ${jobId}:`, error);
    }
  });
}

