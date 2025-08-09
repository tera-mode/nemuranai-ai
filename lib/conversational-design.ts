export interface DesignSession {
  id: string;
  threadId: string;
  userId: string;
  useCase: 'logo' | 'hero_bg' | 'banner';
  status: 'gathering_requirements' | 'confirming_requirements' | 'generating' | 'reviewing' | 'completed';
  requirements: Record<string, any>;
  generatedImages: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementQuestion {
  key: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'color';
  options?: string[];
  required: boolean;
  followUp?: string;
}

// ロゴ作成の要件収集質問
export const LOGO_REQUIREMENTS: RequirementQuestion[] = [
  {
    key: 'brandName',
    question: 'ロゴに使用するブランド名・会社名を教えてください',
    type: 'text',
    required: true
  },
  {
    key: 'industry',
    question: 'どのような業界・サービスですか？',
    type: 'text',
    required: true,
    followUp: '業界に合った適切なイメージでデザインします'
  },
  {
    key: 'vibe',
    question: 'どのような印象を与えたいですか？',
    type: 'select',
    options: ['プロフェッショナル', '親しみやすい', '革新的', 'エレガント', 'モダン', 'クラシック'],
    required: true
  },
  {
    key: 'colors',
    question: '希望するカラーを教えてください（複数可）',
    type: 'text',
    required: true,
    followUp: '例：ゴールド、ホワイト、ネイビー / #FFD700, #FFFFFF, #000080'
  },
  {
    key: 'layout',
    question: 'ロゴの形状はどちらがお好みですか？',
    type: 'select',
    options: ['横長（ワイド）', '正方形（スクエア）', '縦長（トール）'],
    required: true
  },
  {
    key: 'symbolPreference',
    question: 'ロゴにシンボル・アイコンを含めたいですか？',
    type: 'text',
    required: false,
    followUp: '例：抽象的な図形、業界関連のモチーフ、文字のみ等'
  }
];

export class ConversationalDesignManager {
  // セッション管理
  static async createSession(threadId: string, userId: string, useCase: string): Promise<DesignSession> {
    const session: DesignSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      userId,
      useCase: useCase as any,
      status: 'gathering_requirements',
      requirements: {},
      generatedImages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // メモリ内保存（本来はFirestoreに保存）
    this.sessions.set(session.id, session);
    this.sessionsByThread.set(threadId, session.id);
    
    return session;
  }

  static async getSessionByThread(threadId: string): Promise<DesignSession | null> {
    const sessionId = this.sessionsByThread.get(threadId);
    if (!sessionId) return null;
    
    return this.sessions.get(sessionId) || null;
  }

  static async updateSession(sessionId: string, updates: Partial<DesignSession>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates, { updatedAt: new Date() });
    this.sessions.set(sessionId, session);
  }

  // 要件収集
  static getRequirementsForUseCase(useCase: string): RequirementQuestion[] {
    switch (useCase) {
      case 'logo':
        return LOGO_REQUIREMENTS;
      default:
        return [];
    }
  }

  static getNextQuestion(session: DesignSession): RequirementQuestion | null {
    const questions = this.getRequirementsForUseCase(session.useCase);
    
    for (const question of questions) {
      if (!session.requirements[question.key] && question.required) {
        return question;
      }
    }
    
    return null; // All required questions answered
  }

  static async processUserResponse(session: DesignSession, message: string): Promise<string> {
    console.log('🔄 Processing user response:', { sessionId: session.id, message, currentRequirements: session.requirements });
    
    const questions = this.getRequirementsForUseCase(session.useCase);
    const answeredCount = Object.keys(session.requirements).length;
    
    // Store the current answer
    if (answeredCount < questions.length) {
      const currentQuestion = questions[answeredCount];
      session.requirements[currentQuestion.key] = message.trim();
      console.log('💾 Storing requirement:', { key: currentQuestion.key, value: message.trim() });
      await this.updateSession(session.id, session);
    }
    
    // Check if we have more questions
    const updatedAnsweredCount = Object.keys(session.requirements).length;
    console.log('📊 Progress:', { answered: updatedAnsweredCount, total: questions.length });
    
    if (updatedAnsweredCount < questions.length) {
      // Ask next question
      const nextQuestion = questions[updatedAnsweredCount];
      console.log('❓ Asking next question:', nextQuestion.key);
      return this.formatQuestion(nextQuestion);
    } else {
      // All requirements gathered, move to confirmation
      console.log('✅ All requirements gathered, moving to confirmation');
      session.status = 'confirming_requirements';
      await this.updateSession(session.id, session);
      return this.generateRequirementsSummary(session);
    }
  }

  private static getPreviousQuestion(session: DesignSession): RequirementQuestion | null {
    const questions = this.getRequirementsForUseCase(session.useCase);
    const answeredCount = Object.keys(session.requirements).length;
    
    // 現在答えるべき質問のインデックス
    const currentQuestionIndex = answeredCount;
    
    // 現在の質問（まだ答えていない最初の必須質問）
    if (currentQuestionIndex < questions.length) {
      return questions[currentQuestionIndex];
    }
    
    return null;
  }

  private static formatQuestion(question: RequirementQuestion): string {
    let response = `**${question.question}**`;
    
    if (question.options) {
      response += '\n\n選択肢：\n' + question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    }
    
    if (question.followUp) {
      response += `\n\n💡 ${question.followUp}`;
    }
    
    return response;
  }

  private static generateRequirementsSummary(session: DesignSession): string {
    const req = session.requirements;
    const questions = this.getRequirementsForUseCase(session.useCase);
    
    let summary = '**デザイン要件を確認させていただきます：**\n\n';
    
    questions.forEach(question => {
      const value = req[question.key];
      if (value) {
        summary += `• **${question.question.replace('を教えてください', '')}**: ${value}\n`;
      }
    });
    
    summary += '\n**この要件で${session.useCase === "logo" ? "ロゴ" : "デザイン"}を作成してよろしいでしょうか？**\n';
    summary += '「はい」で承認、修正がある場合は具体的にお伝えください。';
    
    return summary;
  }

  // セッションストレージ（本来はFirestore）
  private static sessions = new Map<string, DesignSession>();
  private static sessionsByThread = new Map<string, string>();
}