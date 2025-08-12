import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { conversation } = await request.json();
    console.log('🎯 Title generation request received:', conversation);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation is required' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `以下の会話内容から、適切なスレッドタイトルを生成してください。タイトルは15文字以下で、会話の主要なテーマを表すものにしてください。

会話内容:
${conversation}

タイトルのみを返してください（「タイトル：」などの接頭辞は不要）。日本語で簡潔に。`,
        },
      ],
    });

    const title = response.content[0]?.type === 'text' 
      ? response.content[0].text.trim() 
      : '会話';

    const finalTitle = title.substring(0, 15); // 15文字制限
    console.log('✨ Generated title:', finalTitle);

    return NextResponse.json({
      title: finalTitle,
      success: true,
    });

  } catch (error) {
    console.error('❌ Title Generation API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}