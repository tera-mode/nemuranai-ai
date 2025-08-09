import { UseCase } from '@/types/design';

export interface DesignRequest {
  detected: boolean;
  useCase?: UseCase;
  confidence: number;
  brief: string;
  shouldStartConversation?: boolean;
}

export function detectDesignRequest(message: string, characterDomain: string): DesignRequest {
  // Only trigger for designer characters
  if (characterDomain !== 'designer') {
    return { detected: false, confidence: 0, brief: message };
  }

  const lowerMessage = message.toLowerCase();
  
  // Logo detection patterns
  const logoPatterns = [
    'ロゴ', 'logo', 'ロゴマーク', 'logomark', 'シンボル', 'symbol',
    '会社のロゴ', 'company logo', 'ブランドマーク', 'brand mark',
    'アイコン', 'icon', 'ロゴデザイン', 'logo design'
  ];

  // Hero background detection patterns
  const heroBgPatterns = [
    'ヒーロー', 'hero', 'バナー', 'banner', '背景', 'background',
    'ヘッダー', 'header', 'トップページ', 'top page', 'メインビジュアル', 'main visual',
    'キービジュアル', 'key visual', 'ヒーロー画像', 'hero image'
  ];

  // Design action keywords
  const designActionWords = [
    '作って', '作成', 'create', '制作', 'make', '生成', 'generate',
    'デザイン', 'design', '描いて', 'draw', '書いて', 'write'
  ];

  let maxConfidence = 0;
  let detectedUseCase: UseCase | undefined;

  // Check for logo requests
  const logoScore = calculatePatternScore(lowerMessage, logoPatterns, designActionWords);
  if (logoScore > maxConfidence) {
    maxConfidence = logoScore;
    detectedUseCase = 'logo';
  }

  // Check for hero background requests
  const heroBgScore = calculatePatternScore(lowerMessage, heroBgPatterns, designActionWords);
  if (heroBgScore > maxConfidence) {
    maxConfidence = heroBgScore;
    detectedUseCase = 'hero_bg';
  }

  // Confidence threshold
  const isDesignRequest = maxConfidence >= 0.3;

  return {
    detected: isDesignRequest,
    useCase: detectedUseCase,
    confidence: maxConfidence,
    brief: message,
    shouldStartConversation: isDesignRequest && maxConfidence >= 0.5 // High confidence triggers conversation
  };
}

function calculatePatternScore(
  message: string, 
  patterns: string[], 
  actionWords: string[]
): number {
  let score = 0;
  let patternMatches = 0;
  let actionMatches = 0;

  // Check pattern matches
  for (const pattern of patterns) {
    if (message.includes(pattern)) {
      patternMatches++;
      score += 0.4; // Base score for pattern match
    }
  }

  // Check action word matches
  for (const action of actionWords) {
    if (message.includes(action)) {
      actionMatches++;
      score += 0.3; // Score for action words
    }
  }

  // Boost score if both patterns and actions are present
  if (patternMatches > 0 && actionMatches > 0) {
    score += 0.4;
  }

  // Length penalty for very short messages
  if (message.length < 10) {
    score *= 0.5;
  }

  return Math.min(score, 1.0);
}

export function isLikelyDesignIntent(message: string): boolean {
  const designKeywords = [
    'デザイン', 'design', 'クリエイティブ', 'creative', 'アート', 'art',
    '色', 'color', 'カラー', 'フォント', 'font', 'タイポグラフィ', 'typography',
    'レイアウト', 'layout', 'コンポジション', 'composition', 'ビジュアル', 'visual'
  ];

  const lowerMessage = message.toLowerCase();
  return designKeywords.some(keyword => lowerMessage.includes(keyword));
}