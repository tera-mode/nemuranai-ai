import Anthropic from '@anthropic-ai/sdk';
import { getCharacterById } from '@/lib/character-actions';
import { detectDesignRequest } from '@/lib/design-detection';
import { ConversationalDesignManager } from '@/lib/conversational-design';
import { ConversationalImageGenerator } from '@/lib/conversational-image-generator';
import { SpecBuilderManager } from '@/lib/spec-builder';
import { PlannerManager } from '@/lib/planner';
import { DEFAULT_SKILL_REGISTRY } from '@/lib/plan-spec-types';
import { RunnerEngine } from '@/lib/runner-engine';
import { RunRequest, DEFAULT_RUNNER_ENVIRONMENT } from '@/lib/runner-types';

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
  console.log('🎪 generateCharacterResponse called with:', {
    characterId: request.characterId,
    message: request.message?.substring(0, 50) + '...',
    threadId: request.threadId,
    userId: request.userId
  });

  try {
    // キャラクター情報を取得
    console.log('👤 Getting character by ID:', request.characterId);
    const character = await getCharacterById(request.characterId);
    
    if (!character) {
      return { content: 'キャラクター情報が見つかりません。' };
    }

    // Spec Builder（要件分析）システムの処理
    console.log('🔍 Checking if character needs spec builder:', {
      domain: character.domain,
      hasThreadId: !!request.threadId,
      shouldHandleSpec: (character.domain === 'analyst' || character.domain === 'analysis') && request.threadId
    });
    
    if ((character.domain === 'analyst' || character.domain === 'analysis') && request.threadId) {
      console.log('📋 Calling handleSpecBuilderAnalysis...');
      const specResponse = await handleSpecBuilderAnalysis(request, character);
      console.log('📤 Spec builder response:', {
        hasResponse: !!specResponse,
        contentLength: specResponse?.content?.length || 0
      });
      
      if (specResponse) {
        console.log('✅ Returning spec response');
        console.log('📋 Final response being returned:', JSON.stringify(specResponse, null, 2));
        return specResponse;
      }
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
      analysis: 'データ分析の専門家として、数値分析や改善提案が得意。グラフや統計を用いた説明を好む。また、要件ヒアリングと仕様確定も行える。',
      secretary: '秘書として、スケジュール管理やタスク整理、効率化のアドバイスが得意。',
      strategy: '戦略企画の専門家として、長期的な視点での企画立案や意思決定支援が得意。',
      analyst: 'AI社員オーケストレーターのSpec Builderとして、ユーザーの指示を誤解なく実行可能な仕様（JobSpec）に変換することが専門。要件ヒアリングと仕様確定が得意。'
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
      model: 'claude-sonnet-4-20250514',
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

// Spec Builder（要件分析）システムの処理
async function handleSpecBuilderAnalysis(request: ChatRequest, character: any): Promise<{ content: string; images?: string[] } | null> {
  const { message, threadId, userId } = request;
  console.log('🔍 Spec Builder analysis handler called:', { message, threadId, userId });
  
  // 既存のPlanner セッションをチェック
  console.log('🔍 Checking for existing planner session...');
  const existingPlannerSession = await PlannerManager.getSessionByThread(threadId!);
  if (existingPlannerSession) {
    console.log('🎯 Found existing planner session:', {
      id: existingPlannerSession.id,
      status: existingPlannerSession.status,
      threadId: existingPlannerSession.threadId,
      hasJobSpec: !!existingPlannerSession.job_spec,
      hasPlanSpec: !!existingPlannerSession.plan_spec
    });
    
    const response = await handleExistingPlannerSession(existingPlannerSession, message, character, userId);
    console.log('📤 Planner session response generated:', { 
      hasContent: !!response?.content,
      contentLength: response?.content?.length || 0 
    });
    return response;
  }
  
  // 既存のSpec Builder セッションを確認
  const existingSession = await SpecBuilderManager.getSessionByThread(threadId!);
  console.log('📋 Existing spec session:', existingSession);
  
  if (existingSession) {
    // 既存セッションの処理
    return await handleExistingSpecSession(existingSession, message, character);
  }
  
  // 新しい要件分析要求を検出
  const isSpecRequest = SpecBuilderManager.detectSpecBuilderRequest(message);
  console.log('🔍 Spec builder request detection:', isSpecRequest);
  
  if (isSpecRequest) {
    // 新しいセッションを開始
    const session = await SpecBuilderManager.createSession(
      threadId!,
      userId,
      message
    );
    
    // 初期質問を生成
    const questions = SpecBuilderManager.generateInitialQuestions(message);
    
    // セッションに質問を保存
    await SpecBuilderManager.updateSession(session.id, {
      questions,
      status: 'gathering_requirements'
    });
    
    const response = formatSpecBuilderResponse(character, 
      `承知いたしました。**「${message}」**の要件を整理させていただきます。\n\n` +
      formatSpecBuilderQuestions(questions)
    );
    return response;
  }
  
  return null; // Spec Builder処理ではない通常の応答を返す
}

async function handleExistingPlannerSession(plannerSession: any, message: string, character: any, userId: string): Promise<{ content: string; images?: string[] }> {
  console.log('🎯 Handling existing planner session:', { status: plannerSession.status, message });
  
  try {
    // 実行完了後の結果確認
    if (plannerSession.status === 'execution_started' && 
        (message.includes('結果') || message.includes('状況') || message.includes('どうなった') || message.includes('完了'))) {
      console.log('📊 Checking execution results...');
      
      // アーティファクトから最終結果を取得
      try {
        const { ArtifactStorage } = await import('@/lib/artifact-storage');
        
        // 最新のrunner_sessionsを取得（インデックス不要な方法）
        const { db } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        const sessionsQuery = query(
          collection(db, 'runner_sessions'),
          where('thread_id', '==', plannerSession.threadId)
        );
        
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        // クライアントサイドで並び替え
        const allSessions = sessionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const aTime = a.created_at?.toDate?.() || a.created_at || new Date(0);
            const bTime = b.created_at?.toDate?.() || b.created_at || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });
        
        if (allSessions.length > 0) {
          const latestSession = allSessions[0];
          console.log('📋 Found runner session:', { 
            status: latestSession.status, 
            runId: latestSession.run_id 
          });
          
          if (latestSession.status === 'completed' && latestSession.result) {
            // 最終成果物を取得
            const deliverables = latestSession.result.deliverables || [];
            if (deliverables.length > 0) {
              const finalArtifactId = deliverables[0].artifact_id;
              const reportContent = await ArtifactStorage.getArtifactContent(finalArtifactId);
              
              if (reportContent) {
                await PlannerManager.updateSession(plannerSession.id, {
                  status: 'execution_completed'
                });
                
                return formatSpecBuilderResponse(character,
                  `🎉 **実行が完了しました！**\n\n` +
                  `以下が調査結果のレポートです：\n\n` +
                  `---\n\n${reportContent}\n\n---\n\n` +
                  `💡 この結果は${Math.floor(latestSession.result.execution_time_ms / 1000)}秒で生成されました。`
                );
              }
            }
          } else {
            console.log('📊 Runner session status:', latestSession.status);
          }
        }
        
        return formatSpecBuilderResponse(character,
          `⏳ **実行は進行中です...**\n\n` +
          `現在AI社員オーケストレーターが作業中です。\n` +
          `完了まで今しばらくお待ちください。\n\n` +
          `💡 「結果はどうなった？」と聞いていただければ、最新の状況をお知らせします。`
        );
        
      } catch (error) {
        console.error('❌ Error checking results:', error);
        return formatSpecBuilderResponse(character,
          `⚠️ 実行状況の確認中にエラーが発生しました。\n\n` +
          `しばらく待ってから再度「結果はどうなった？」とお聞きください。`
        );
      }
    }
    
    if (plannerSession.status === 'plan_ready') {
    // 実行開始判定
    if (message.toLowerCase().includes('実行開始') || 
        message.toLowerCase().includes('実行') || 
        message.toLowerCase().includes('開始') ||
        message.toLowerCase().includes('承認') ||
        message.toLowerCase().includes('はい') ||
        message.toLowerCase().includes('ok')) {
      
      // UUID生成
      const generateRunId = (): string => {
        return 'run_' + Math.random().toString(36).substr(2, 9);
      };

      try {
        console.log('🚀 Starting execution phase...');
        
        // 実際の実行を開始
        console.log('⚡ Starting actual AI orchestration execution...');
        
        // セッション状態を実行開始に更新
        await PlannerManager.updateSession(plannerSession.id, {
          status: 'execution_started'
        });
        
        // バックグラウンドで実行開始
        console.log('🚀 Starting background execution via /api/run...');
        
        try {
          // 直接RunnerEngineを使用（内部API呼び出しを回避）
          const { RunnerEngine } = await import('@/lib/runner-engine');
          const { DEFAULT_RUNNER_ENVIRONMENT } = await import('@/lib/runner-types');
          
          const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const runRequest = {
            mode: 'run_request' as const,
            run_id: runId,
            job_spec: plannerSession.job_spec,
            plan_spec: plannerSession.plan_spec,
            skill_registry: plannerSession.skill_registry || [],
            env: DEFAULT_RUNNER_ENVIRONMENT
          };
          
          // バックグラウンドで実行
          const runner = new RunnerEngine(runRequest);
          
          // スコープを保存
          const execUserId = userId; // 関数のパラメータから取得
          const execThreadId = plannerSession.threadId;
          
          // 非同期で実行開始（レスポンス待ちなし）
          setImmediate(async () => {
            try {
              console.log('🎬 Starting background runner execution');
              await runner.run(execThreadId, execUserId);
              console.log('✅ Background execution completed');
            } catch (error) {
              console.error('❌ Background execution failed:', error);
            }
          });
          
          // 実行時間の見積もり
          const estimatedTimeMs = plannerSession.plan_spec?.graph?.nodes?.reduce((total: number, node: any) => {
            return total + (node.estimates?.latency_ms_p50 || 1000);
          }, 0) || 5000;
          
          console.log('✅ Background execution started:', runId);
          
          // 実行開始の確認メッセージ（実際の実行情報付き）
          return formatSpecBuilderResponse(character,
            `🚀 **実行を開始しました！** (ID: ${runId})\n\n` +
            `AI社員オーケストレーターが以下の手順で作業を進行します：\n\n` +
            `**📋 実行プラン**:\n` +
            plannerSession.plan_spec?.graph?.nodes?.map((node: any, index: number) => 
              `${index + 1}. **${node.title}** - ${node.purpose}`
            ).join('\n') +
            `\n\n⏳ **処理を実行中です...** 約${Math.ceil(estimatedTimeMs / 1000)}秒で完了予定\n\n` +
            `📊 実行状況は次回の会話で確認いたします。`
          );
        } catch (runError) {
          console.error('❌ Background execution error:', runError);
          
          // フォールバック: 実行プランのみ表示
          return formatSpecBuilderResponse(character,
            `🚀 **実行プランを準備しました！**\n\n` +
            `AI社員オーケストレーターが以下の手順で作業を進行します：\n\n` +
            `**📋 実行プラン**:\n` +
            plannerSession.plan_spec?.graph?.nodes?.map((node: any, index: number) => 
              `${index + 1}. **${node.title}** - ${node.purpose}`
            ).join('\n') +
            `\n\n⚠️ 実行は準備中です。しばらくお待ちください。`
          );
        }
        
      } catch (error) {
        console.error('❌ Execution failed:', error);
        return formatSpecBuilderResponse(character,
          `実行開始中にエラーが発生しました：${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
          `もう一度「実行開始」とお試しください。`
        );
      }
      
    } else {
      // 修正要求など
      const planSummary = formatPlanSpecResponse(plannerSession.plan_spec);
      return formatSpecBuilderResponse(character,
        `現在の実行計画をご確認ください。\n\n${planSummary}\n\n` +
        `計画に問題がなければ「実行開始」または「承認」とお答えください。\n` +
        `修正希望がある場合は具体的にお聞かせください。`
      );
    }
  }
  
  if (plannerSession.status === 'execution_started') {
    // 実行状況確認
    const nodeCount = plannerSession.plan_spec?.graph?.nodes?.length || 0;
    return formatSpecBuilderResponse(character,
      `🔄 実行中です...\n\n` +
      `**実行ID**: ${plannerSession.run_id}\n` +
      `**ステータス**: running\n` +
      `**ノード数**: ${nodeCount}\n\n` +
      `バックグラウンドで実行中です。完了までもうしばらくお待ちください。\n` +
      `進行状況は内部で管理され、完了次第結果をお知らせします。`
    );
  }
  
  if (plannerSession.status === 'execution_completed') {
    // 実行完了
    return formatSpecBuilderResponse(character,
      `✅ 実行が完了しました！\n\n` +
      `**実行ID**: ${plannerSession.run_id}\n` +
      `**ステータス**: completed\n\n` +
      `実行結果については、Firestore内の runner_sessions コレクションで確認できます。\n` +
      `成果物は artifacts コレクションに保存されています。`
    );
  }
  
  if (plannerSession.status === 'execution_failed') {
    // 実行失敗
    return formatSpecBuilderResponse(character,
      `❌ 実行中にエラーが発生しました。\n\n` +
      `**実行ID**: ${plannerSession.run_id}\n` +
      `**ステータス**: failed\n\n` +
      `「実行開始」と再度お試しいただくか、計画の修正をご検討ください。`
    );
  }
  
    // その他の状態
    return formatSpecBuilderResponse(character, 'Plannerセッションを処理中...');
  } catch (error) {
    console.error('❌ Error in handleExistingPlannerSession:', error);
    return formatSpecBuilderResponse(character,
      `セッション処理中にエラーが発生しました：${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
      `もう一度お試しください。`
    );
  }
}

async function handleExistingSpecSession(session: any, message: string, character: any): Promise<{ content: string; images?: string[] }> {
  console.log('📝 Handling existing spec session:', { status: session.status, message });
  
  if (session.status === 'gathering_requirements') {
    console.log('📋 Processing requirement gathering...');
    // 要件収集中
    const response = await SpecBuilderManager.processUserResponse(session, message);
    console.log('📤 Response from requirement processing:', response);
    return formatSpecBuilderResponse(character, response);
  }
  
  if (session.status === 'confirming_requirements') {
    // 要件確認中
    if (message.toLowerCase().includes('はい') || message.toLowerCase().includes('ok') || message.toLowerCase().includes('承認')) {
      // 承認された場合 - JobSpec生成
      try {
        const jobSpec = await SpecBuilderManager.generateJobSpec(session);
        
        // セッション完了
        await SpecBuilderManager.updateSession(session.id, {
          job_spec: jobSpec,
          status: 'completed'
        });
        
        const specOutput = {
          mode: 'spec' as const,
          job_spec: jobSpec,
          summary: [
            `タスク: ${jobSpec.user_intent}`,
            `成果物: ${jobSpec.goal}`,
            `タイプ: ${jobSpec.task_type}`,
            `制約: プライバシー${jobSpec.constraints.privacy}、期限${jobSpec.constraints.deadline_hint || '未指定'}`
          ],
          next_actions: [
            'DAG計画の作成',
            'モジュール選定（ウェブスクレイピング、分析、可視化など）',
            '実行環境の準備'
          ]
        };
        
        const responseText = formatJobSpecResponse(specOutput);
        
        // JobSpec完了後、自動的にPlanner段階へ進む
        try {
          console.log('🎯 Auto-transitioning to Planner stage...');
          
          // Plannerセッション作成
          const plannerSession = await PlannerManager.createSession(
            session.threadId,
            session.userId,
            jobSpec
          );
          
          // PlanSpec生成
          const planSpec = PlannerManager.generatePlanSpec(jobSpec, DEFAULT_SKILL_REGISTRY);
          
          // Plannerセッションを更新
          await PlannerManager.updateSession(plannerSession.id, {
            plan_spec: planSpec,
            status: 'plan_ready'
          });
          
          // Plan表示用のレスポンス生成
          const planSummary = formatPlanSpecResponse(planSpec);
          const combinedResponse = responseText + '\n\n---\n\n' + planSummary;
          
          console.log('✅ Auto-transition to Planner completed');
          return formatSpecBuilderResponse(character, combinedResponse);
        } catch (plannerError) {
          console.error('❌ Planner auto-transition failed:', plannerError);
          // Plannerエラーの場合はJobSpecのみ返す
          return formatSpecBuilderResponse(character, responseText);
        }
      } catch (error) {
        console.error('JobSpec generation error:', error);
        return formatSpecBuilderResponse(character,
          'JobSpec生成中にエラーが発生しました。もう一度お試しください。'
        );
      }
    } else {
      // 修正要求がある場合
      return formatSpecBuilderResponse(character,
        'かしこまりました！修正内容を反映いたします。\n\n修正したい項目を具体的に教えてください。'
      );
    }
  }
  
  if (session.status === 'completed') {
    // JobSpec完了後の処理はhandleExistingPlannerSessionで行う
    return formatSpecBuilderResponse(character,
      'JobSpecが完了しています。実行計画の確認は別途処理されます。'
    );
  }
  
  // その他の状態の処理
  return formatSpecBuilderResponse(character, 'セッションを続行しています...');
}

function formatSpecBuilderResponse(character: any, content: string): { content: string; images?: string[] } {
  // キャラクターの性格に応じて応答をフォーマット
  const personalities: Record<string, (text: string) => string> = {
    tsundere: (text) => `${text}\n\nべ、別にあなたのためじゃないんだからね！`,
    genki: (text) => `${text}\n\n一緒に素敵な仕様を作りましょう♪`,
    serious: (text) => `${text}\n\n責任を持って要件整理を行います。`,
    default: (text) => text
  };
  
  const formatter = personalities[character.personality] || personalities.default;
  const formattedContent = formatter(content);
  
  return { content: formattedContent };
}

function formatSpecBuilderQuestions(questions: any[]): string {
  let response = '';
  
  questions.forEach((question, index) => {
    response += `\n**${index + 1}. ${question.label}**\n`;
    
    if (question.options) {
      response += '選択肢：\n' + question.options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n') + '\n';
    }
    
    if (question.hint) {
      response += `💡 ${question.hint}\n`;
    }
    
    if (question.default) {
      response += `（デフォルト: ${question.default}）\n`;
    }
    response += '\n';
  });
  
  response += '上記の質問に番号付きで回答してください。例：「1. マークダウンレポート 2. 1時間以内...」';
  
  return response;
}

function formatJobSpecResponse(specOutput: any): string {
  const { job_spec, summary, next_actions } = specOutput;
  
  let response = '## ✅ JobSpec生成完了\n\n';
  
  // サマリー
  response += '### 📋 要件サマリー\n';
  summary.forEach((item: string) => {
    response += `- ${item}\n`;
  });
  response += '\n';
  
  // JobSpec詳細（JSON形式）
  response += '### 📄 JobSpec（JSON）\n```json\n';
  response += JSON.stringify(job_spec, null, 2);
  response += '\n```\n\n';
  
  // 次のアクション
  response += '### 🚀 次のステップ\n';
  next_actions.forEach((action: string) => {
    response += `- ${action}\n`;
  });
  response += '\n';
  
  response += '**この仕様で実行を開始しますか？** それとも修正がございますか？';
  
  return response;
}

function formatPlanSpecResponse(planSpec: any): string {
  const nodeCount = planSpec.graph.nodes.length;
  const parallelism = planSpec.parallelism;
  const estimatedTime = planSpec.graph.nodes.reduce((total: number, node: any) => {
    return total + (node.estimates.latency_ms_p50 || 1000);
  }, 0);
  
  let response = '## 🚀 実行計画（第二段階完了）\n\n';
  response += `**計画概要**: ${planSpec.summary}\n\n`;
  response += `**処理ステップ**: ${nodeCount}段階の処理フロー\n`;
  response += `**並列度**: ${parallelism === 'safe' ? '安全モード' : parallelism === 'aggressive' ? '高速モード' : '順次処理'}\n`;
  response += `**予想時間**: 約${Math.ceil(estimatedTime / 1000)}秒\n\n`;
  
  response += '### 📋 処理フロー詳細\n';
  planSpec.graph.nodes.forEach((node: any, index: number) => {
    const costIcon = node.estimates.cost_hint === 'high' ? '🔴' : node.estimates.cost_hint === 'mid' ? '🟡' : '🟢';
    response += `**${index + 1}. ${node.title}** ${costIcon}\n`;
    response += `   └ ${node.purpose}\n`;
    if (node.fallbacks.length > 0) {
      response += `   └ 代替案: ${node.fallbacks.join(', ')}\n`;
    }
    response += '\n';
  });
  
  response += '### ✅ 検収条件の対応\n';
  planSpec.coverage_to_acceptance.forEach((coverage: any) => {
    const status = coverage.gaps.length === 0 ? '✅' : '⚠️';
    response += `${status} **${coverage.criterion}**\n`;
    response += `   └ 対応ステップ: ${coverage.satisfied_by_nodes.join(', ')}\n`;
  });
  
  if (planSpec.assumptions.length > 0) {
    response += '\n### 💡 前提条件\n';
    planSpec.assumptions.forEach((assumption: string) => {
      response += `- ${assumption}\n`;
    });
  }
  
  if (planSpec.open_issues.length > 0) {
    response += '\n### ⚠️ 確認事項\n';
    planSpec.open_issues.forEach((issue: string) => {
      response += `- ${issue}\n`;
    });
  }
  
  response += '\n### 📄 PlanSpec（JSON）\n```json\n';
  response += JSON.stringify(planSpec, null, 2);
  response += '\n```\n\n';
  
  response += '**この計画で実行を開始しますか？** 「実行開始」または「承認」とお答えください。\n';
  response += '修正希望がある場合は具体的にお聞かせください。';
  
  return response;
}