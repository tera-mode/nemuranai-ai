import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim() === '') {
      return NextResponse.json({ translatedText: '' });
    }

    // 既に英語の場合はそのまま返す（簡易的な判定）
    if (!/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
      return NextResponse.json({ translatedText: text });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found, returning original text');
      return NextResponse.json({ translatedText: text });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `Translate the following Japanese text to English for use in an image generation prompt. Keep it concise and descriptive: "${text}"`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Translation API error: ${response.status} - ${errorText}`);
      return NextResponse.json({ translatedText: text }); // フォールバック
    }

    const data = await response.json();
    const translatedText = data.content[0]?.text?.trim() || text;
    
    console.log('🔤 Translation API:', { original: text, translated: translatedText });
    return NextResponse.json({ translatedText });

  } catch (error) {
    console.error('Translation API error:', error);
    const { text } = await request.json();
    return NextResponse.json({ translatedText: text || '' }); // フォールバック
  }
}