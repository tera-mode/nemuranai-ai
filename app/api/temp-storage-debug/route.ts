import { NextRequest, NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/temp-storage';

export async function GET(request: NextRequest) {
  try {
    const stats = getStorageStats();
    
    return NextResponse.json({
      success: true,
      ...stats,
      debug: {
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        uptime: process.uptime()
      }
    });
    
  } catch (error) {
    console.error('Temp storage debug error:', error);
    return NextResponse.json(
      { error: 'Failed to get storage stats' },
      { status: 500 }
    );
  }
}