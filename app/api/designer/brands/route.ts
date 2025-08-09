import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createBrand, getUserBrands } from '@/lib/design-actions';
import { Brand } from '@/types/design';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, styleTokens } = body;

    // Validate request
    if (!name || !styleTokens) {
      return NextResponse.json(
        { error: 'Missing required fields: name, styleTokens' },
        { status: 400 }
      );
    }

    // Validate styleTokens structure
    if (!styleTokens.palette || !styleTokens.fonts || !styleTokens.tone) {
      return NextResponse.json(
        { error: 'styleTokens must include palette, fonts, and tone' },
        { status: 400 }
      );
    }

    // Create brand
    const brandId = await createBrand({
      name,
      styleTokens,
      createdBy: session.user.id
    });

    return NextResponse.json({ 
      message: 'Brand created successfully',
      brandId 
    });

  } catch (error) {
    console.error('Error creating brand:', error);
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

    const brands = await getUserBrands(session.user.id);
    return NextResponse.json(brands);

  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}