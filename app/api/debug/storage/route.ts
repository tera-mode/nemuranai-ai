import { NextRequest, NextResponse } from 'next/server';
import { testFirebaseStorageConnection, testFirebaseAdminStorage, getStorageInfo } from '@/lib/storage-debug';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'info';
    
    if (action === 'test') {
      console.log('🧪 Running Firebase Storage connection test...');
      const result = await testFirebaseStorageConnection();
      
      return NextResponse.json({
        action: 'connection_test',
        timestamp: new Date().toISOString(),
        ...result
      });
    }
    
    if (action === 'admin-test') {
      console.log('🧪 Running Firebase Admin Storage test...');
      const result = await testFirebaseAdminStorage();
      
      return NextResponse.json({
        action: 'admin_storage_test',
        timestamp: new Date().toISOString(),
        ...result
      });
    }
    
    if (action === 'info') {
      const info = getStorageInfo();
      
      return NextResponse.json({
        action: 'storage_info',
        timestamp: new Date().toISOString(),
        success: true,
        ...info
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use ?action=info, ?action=test, or ?action=admin-test'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Storage debug API error:', error);
    return NextResponse.json({
      error: 'Debug API error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}