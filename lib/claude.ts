import Anthropic from '@anthropic-ai/sdk';
import { getCharacterById } from '@/lib/character-actions';
import { detectDesignRequest } from '@/lib/design-detection';
import { ConversationalDesignManager } from '@/lib/conversational-design';
import { ConversationalImageGenerator } from '@/lib/conversational-image-generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ChatRequest {
  message: string;
  characterId: string;
  userId: string;
  threadId?: string;
  context?: string;
  useMarkdown?: boolean;
}

export async function generateCharacterResponse(request: ChatRequest): Promise<{ content: string; images?: string[] }> {
  try {
    // キャラクター情報を取得
    const character = await getCharacterById(request.characterId);
    
    if (!character) {
      return { content: 'キャラクター情報が見つかりません。' };
    }

    // 対話型デザインシステムの処理
    if (character.domain === 'designer' && request.threadId) {
      const designResponse = await handleConversationalDesign(request, character);
      if (designResponse) {
        return designResponse;
      }
    }

    // キャラクターの属性に応じたプロンプトを構築
    const personalityPrompts: Record<string, string> = {
      tsundere: 'ツンデレの性格で、素直になれないけれど実は優しい話し方をする。「べ、別に〜」や「〜なんだからね！」のような口調を使う。',
      kuudere: 'クールで冷静だが、実は心優しい性格。感情をあまり表に出さず、「...ふん」のような反応をするが、的確なアドバイスをする。',
      genki: '明るく前向きで元気いっぱい。「〜ですよ♪」「がんばりましょー！」のような明るい口調で話す。',
      serious: '真面目で責任感が強く、丁寧語を使う。「承知いたしました」「責任を持って対応いたします」のような話し方。',
      mysterious: '謎めいていて、時々意味深な発言をする。「...興味深いですね」「それは...どうでしょうか」のような話し方。',
      innocent: '純粋で優しく、感嘆詞を多用する。「わあ！」「すごいです！」「頑張ります！」のような話し方。'
    };

    const domainPrompts: Record<string, string> = {
      sales: '営業のプロフェッショナルとして、売上向上や顧客獲得に関するアドバイスが得意。数字やKPIを重視する。',
      marketing: 'マーケティングの専門家として、ブランディングや集客戦略に詳しい。トレンドや SNS 活用も得意。',
      support: 'カスタマーサポートのスペシャリストとして、顧客満足度向上や問題解決が得意。',
      analysis: 'データ分析の専門家として、数値分析や改善提案が得意。グラフや統計を用いた説明を好む。',
      secretary: '秘書として、スケジュール管理やタスク整理、効率化のアドバイスが得意。',
      strategy: '戦略企画の専門家として、長期的な視点での企画立案や意思決定支援が得意。'
    };

    const racePrompts: Record<string, string> = {
      dragon: '古代の知恵を持つドラゴン族として、長い経験に基づいた深い洞察を提供する。時々古い言い回しを使う。',
      elf: '自然の力を操るエルフとして、調和と効率を重視する。美的センスも優れている。',
      android: '高性能なアンドロイドとして、論理的で正確な分析を得意とする。時々システム用語を使う。',
      ghost: '人間の心を理解する地縛霊として、感情面でのサポートが得意。心理的な洞察に優れる。',
      mage: '魔法使いとして、創造的で革新的なアプローチを提案する。「魔法のように」効率的な解決法を好む。',
      genius: '天才児として、斬新なアイデアや発想を提供する。時々子供っぽい表現も混じる。'
    };

    const prompt = `
あなたは${character.name}です。以下の設定で応答してください：

【基本情報】
- 名前: ${character.name}
- 種族: ${character.race} (${racePrompts[character.race] || ''})
- 性格: ${character.personality} (${personalityPrompts[character.personality] || ''})
- 専門分野: ${character.domain} (${domainPrompts[character.domain] || ''})
- バックストーリー: ${character.backstory || '特別な背景はありません'}

【能力値】
- 効率性: ${character.stats.efficiency}/100
- 創造性: ${character.stats.creativity}/100
- 共感力: ${character.stats.empathy}/100
- 正確性: ${character.stats.accuracy}/100

【応答スタイル】
- 上記の性格、種族、専門分野の特徴を反映した独特の話し方で応答
- 専門分野に関する質問には特に詳しく、実用的なアドバイスを提供
- キャラクターの能力値に応じた得意分野を活かした回答
- 親しみやすく、ユーザーをサポートする姿勢を保つ
- 日本語で自然な会話を心がける
${request.useMarkdown ? `
【マークダウン記法】
- 見出しには # ## ### を使用
- 重要な部分は **太字** で強調
- リストは - や 1. を使用
- コードは \`code\` や \`\`\`code\`\`\` で囲む
- 表は | で作成
- 読みやすい構造化された形式で応答すること
- 長い説明は適切に改行と段落分けを行う` : ''}

【ユーザーからのメッセージ】
${request.message}

${request.context ? `【追加のコンテキスト】\n${request.context}` : ''}

上記のキャラクター設定を完全に反映して、${character.name}として自然で魅力的な応答をしてください。
`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0];
    return { content: responseText?.type === 'text' ? responseText.text : 'エラーが発生しました。' };
  } catch (error) {
    console.error('Claude API Error:', error);
    return { content: '申し訳ありません。現在システムに問題が発生しています。しばらくしてから再度お試しください。' };
  }
}

// 対話型デザインシステムの処理
async function handleConversationalDesign(request: ChatRequest, character: any): Promise<{ content: string; images?: string[] } | null> {
  const { message, threadId, userId } = request;
  console.log('🎨 Conversational design handler called:', { message, threadId, userId });
  
  // 既存のセッションを確認
  const existingSession = await ConversationalDesignManager.getSessionByThread(threadId!);
  console.log('🔍 Existing session:', existingSession);
  
  if (existingSession) {
    // 既存セッションの処理
    return await handleExistingSession(existingSession, message, character);
  }
  
  // 新しいデザイン要求を検出
  const designRequest = detectDesignRequest(message, character.domain);
  console.log('🔍 Design request detection:', designRequest);
  
  if (designRequest.shouldStartConversation && designRequest.useCase) {
    // 新しいセッションを開始
    const session = await ConversationalDesignManager.createSession(
      threadId!,
      userId,
      designRequest.useCase
    );
    
    const firstQuestion = ConversationalDesignManager.getNextQuestion(session);
    if (firstQuestion) {
      const response = formatDesignerResponse(character, 
        `${designRequest.useCase === 'logo' ? 'ロゴ' : 'デザイン'}作成のお手伝いをさせていただきますね！\n\n${formatQuestion(firstQuestion)}`
      );
      return response;
    }
  }
  
  return null; // 対話型デザインではない通常の応答を返す
}

async function handleExistingSession(session: any, message: string, character: any): Promise<{ content: string; images?: string[] }> {
  console.log('📝 Handling existing session:', { status: session.status, message });
  
  if (session.status === 'gathering_requirements') {
    console.log('📋 Processing requirement gathering...');
    // 要件収集中
    const response = await ConversationalDesignManager.processUserResponse(session, message);
    console.log('📤 Response from requirement processing:', response);
    return formatDesignerResponse(character, response);
  }
  
  if (session.status === 'confirming_requirements') {
    // 要件確認中
    if (message.toLowerCase().includes('はい') || message.toLowerCase().includes('ok') || message.toLowerCase().includes('承認')) {
      // 承認された場合 - 画像生成開始
      session.status = 'generating';
      await ConversationalDesignManager.updateSession(session.id, session);
      
      // バックグラウンドで画像生成を開始
      generateImageInBackground(session, character);
      
      return formatDesignerResponse(character, 
        '承認ありがとうございます！🎨\n\n**AIが作業中です...**\n\nデザインを生成していますので、少々お待ちください。'
      );
    } else {
      // 修正要求がある場合
      return formatDesignerResponse(character,
        'かしこまりました！修正内容を反映して、再度要件をお聞きします。\n\n修正したい項目を具体的に教えてください。'
      );
    }
  }
  
  if (session.status === 'generating') {
    // 生成中 - 進行状況確認
    return formatDesignerResponse(character,
      '🎨 **AIが作業中です...**\n\nデザインを生成中です。もう少々お待ちください。'
    );
  }
  
  if (session.status === 'reviewing') {
    // 生成完了 - 画像を表示
    if (session.generatedImages.length > 0) {
      const imageId = session.generatedImages[0];
      const imageUrl = `/api/temp-images/${imageId}`;
      
      return formatDesignerResponse(character,
        `✨ デザインが完成しました！\n\nいかがでしょうか？修正点があれば遠慮なくお聞かせください。`,
        [imageUrl]
      );
    }
    
    // レビュー中 - 改善要求などの処理
    return formatDesignerResponse(character,
      'フィードバックをありがとうございます！ご要望に応じて調整いたします。\n\n具体的な修正点を教えてください。'
    );
  }
  
  if (session.status === 'failed') {
    // 生成失敗
    return formatDesignerResponse(character,
      '申し訳ございません。デザイン生成中にエラーが発生しました。\n\nもう一度お試しいただけますか？「はい」とおっしゃっていただければ、再度生成いたします。'
    );
  }
  
  // その他の状態の処理
  return formatDesignerResponse(character, 'デザインセッションを続行しています...');
}

function formatDesignerResponse(character: any, content: string, images?: string[]): { content: string; images?: string[] } {
  // キャラクターの性格に応じて応答をフォーマット
  const personalities: Record<string, (text: string) => string> = {
    tsundere: (text) => `${text}\n\nべ、別にあなたのためじゃないんだからね！`,
    genki: (text) => `${text}\n\n一緒に素敵なデザインを作りましょう♪`,
    serious: (text) => `${text}\n\n責任を持って対応させていただきます。`,
    default: (text) => text
  };
  
  const formatter = personalities[character.personality] || personalities.default;
  const formattedContent = formatter(content);
  
  return images && images.length > 0 
    ? { content: formattedContent, images }
    : { content: formattedContent };
}

function formatQuestion(question: any): string {
  let response = `**${question.question}**`;
  
  if (question.options) {
    response += '\n\n選択肢：\n' + question.options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
  }
  
  if (question.followUp) {
    response += `\n\n💡 ${question.followUp}`;
  }
  
  return response;
}

// バックグラウンドで画像生成を実行
async function generateImageInBackground(session: any, character: any) {
  // より詳細なログ
  console.log('🎬 Starting background image generation process');
  console.log('📝 Session details:', {
    id: session.id,
    threadId: session.threadId,
    userId: session.userId,
    useCase: session.useCase,
    status: session.status,
    requirements: session.requirements
  });

  process.nextTick(async () => {
    try {
      console.log('🎨 Inside nextTick - Beginning image generation for session:', session.id);
      console.log('⏰ Generation started at:', new Date().toISOString());
      
      let tempId: string;
      
      if (session.useCase === 'logo') {
        console.log('🏷️ Generating logo with requirements:', session.requirements);
        tempId = await ConversationalImageGenerator.generateLogoFromRequirements(session);
        console.log('✨ Logo generation returned tempId:', tempId);
      } else {
        const error = `Unsupported use case: ${session.useCase}`;
        console.error('❌ Use case error:', error);
        throw new Error(error);
      }

      console.log('🔄 Updating session status to reviewing...');
      
      // セッションを更新
      await ConversationalDesignManager.updateSession(session.id, {
        ...session,
        generatedImages: [tempId],
        status: 'reviewing'
      });
      
      console.log('✅ Session updated successfully!');
      console.log('🎉 Background image generation completed at:', new Date().toISOString());
      console.log('🔗 Generated tempId:', tempId);
      
      // 完了メッセージをスレッドに追加
      try {
        const { addMessageToThread } = await import('@/lib/thread-actions');
        const imageUrl = `/api/temp-images/${tempId}`;
        
        const completionMessage = `✨ デザインが完成しました！\n\nいかがでしょうか？修正点があれば遠慮なくお聞かせください。`;
        
        await addMessageToThread(
          session.threadId,
          character.id,
          session.userId,
          completionMessage,
          'assistant',
          true,
          [imageUrl]
        );
        
        console.log('📨 Completion message added to thread');
      } catch (messageError) {
        console.error('❌ Failed to add completion message:', messageError);
      }
      
      // TODO: リアルタイムでフロントエンドに通知
      // この部分は後で実装 - 今はポーリングで確認
      
    } catch (error) {
      console.error('❌ Background image generation failed at:', new Date().toISOString());
      console.error('💥 Error details:', error);
      console.error('📚 Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      try {
        // エラー時にセッションステータスを更新
        await ConversationalDesignManager.updateSession(session.id, {
          ...session,
          status: 'failed'
        });
        console.log('⚠️  Session marked as failed');
      } catch (updateError) {
        console.error('💥 Failed to update session to failed status:', updateError);
      }
    }
  });
}