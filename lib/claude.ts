import Anthropic from '@anthropic-ai/sdk';
import { getCharacterById } from '@/lib/character-actions';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ChatRequest {
  message: string;
  characterId: string;
  userId: string;
  context?: string;
  useMarkdown?: boolean;
}

export async function generateCharacterResponse(request: ChatRequest): Promise<string> {
  try {
    // キャラクター情報を取得
    const character = await getCharacterById(request.characterId);
    
    if (!character) {
      return 'キャラクター情報が見つかりません。';
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
    return responseText?.type === 'text' ? responseText.text : 'エラーが発生しました。';
  } catch (error) {
    console.error('Claude API Error:', error);
    return '申し訳ありません。現在システムに問題が発生しています。しばらくしてから再度お試しください。';
  }
}