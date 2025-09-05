// Spec Builder - 要件ヒアリングとJobSpec生成システム
// UUID生成（uuid パッケージの代替）
function generateUuid(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import { db } from '@/lib/firebase-client';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import {
  SpecBuilderSession,
  SpecBuilderSessionStatus,
  Question,
  JobSpec,
  FormModeOutput,
  SpecModeOutput,
  SpecBuilderOutput,
  UserAnswers,
  TaskType,
  PrivacyLevel
} from '@/lib/job-spec-types';

export class SpecBuilderManager {
  // セッション作成
  static async createSession(threadId: string, userId: string, userRequest: string): Promise<SpecBuilderSession> {
    const sessionData: Omit<SpecBuilderSession, 'id'> = {
      threadId,
      userId,
      status: 'gathering_requirements',
      user_request: userRequest,
      questions: [],
      user_answers: {},
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await addDoc(collection(db, 'spec_builder_sessions'), sessionData);
    return {
      id: docRef.id,
      ...sessionData
    };
  }

  // セッション取得（スレッドID基準）
  static async getSessionByThread(threadId: string): Promise<SpecBuilderSession | null> {
    try {
      const q = query(
        collection(db, 'spec_builder_sessions'),
        where('threadId', '==', threadId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // 最新のセッションを取得
      const sessions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : data.created_at,
          updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : data.updated_at,
        } as SpecBuilderSession;
      });

      return sessions.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
    } catch (error) {
      console.error('Error getting spec builder session:', error);
      return null;
    }
  }

  // セッション更新
  static async updateSession(sessionId: string, updates: Partial<SpecBuilderSession>): Promise<void> {
    try {
      const docRef = doc(db, 'spec_builder_sessions', sessionId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error updating spec builder session:', error);
      throw error;
    }
  }

  // 要件ヒアリング検出
  static detectSpecBuilderRequest(message: string): boolean {
    const keywords = [
      '調べて', '分析して', '調査して', 'レポート', 'まとめて', 'リサーチ',
      '比較して', '評価して', '検証して', 'チェックして',
      '要件', '仕様', 'スペック', '整理', 'ヒアリング',
      '業務', 'タスク', '依頼', '作業', 'について'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // より具体的なパターンマッチング
    const patterns = [
      /について.*調べて/,
      /について.*分析/,
      /について.*調査/,
      /を.*調べて/,
      /を.*分析/,
      /を.*調査/,
      /.*について.*教えて/,
      /.*の.*情報/,
      /.*企業.*について/
    ];
    
    // パターンマッチングまたはキーワードマッチング
    const hasPattern = patterns.some(pattern => pattern.test(lowerMessage));
    const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasPattern || hasKeyword || 
           lowerMessage.includes('ai社員に') ||
           lowerMessage.includes('依頼');
  }

  // 初期質問生成
  static generateInitialQuestions(userRequest: string): Question[] {
    // 基本的な質問セットを生成
    // 実際の実装では Claude API を使って動的生成することも可能
    const questions: Question[] = [
      {
        id: 'task_goal',
        label: '最終的に期待する成果物の形式を教えてください',
        type: 'select',
        required: true,
        options: [
          'マークダウンレポート',
          'CSVデータ表',
          'プレゼンテーション資料',
          'グラフ・チャート',
          'その他（自由記述）'
        ],
        hint: '例：A4×2ページのサマリー、比較表1点など'
      },
      {
        id: 'deadline',
        label: 'いつまでに必要ですか？',
        type: 'select',
        required: false,
        options: [
          '10分以内',
          '1時間以内',
          '今日中',
          '明日まで',
          '1週間以内',
          '急ぎではない'
        ],
        default: '1時間以内'
      },
      {
        id: 'data_sources',
        label: '情報収集の対象を教えてください',
        type: 'text',
        required: false,
        hint: '例：公式サイトのみ、ニュースメディア、特定のドメイン指定など'
      },
      {
        id: 'privacy_level',
        label: '成果物の公開範囲はどちらですか？',
        type: 'select',
        required: true,
        options: [
          '社外公開可能',
          '社内のみ',
          '個人情報は除外'
        ],
        default: '社外公開可能'
      }
    ];

    return questions;
  }

  // ユーザー回答処理
  static async processUserResponse(session: SpecBuilderSession, userMessage: string): Promise<string> {
    try {
      // 簡単な回答解析（実際はより sophisticated な処理が必要）
      const answers = this.parseUserAnswers(userMessage, session.questions);
      
      // セッションを更新
      const updatedAnswers = { ...session.user_answers, ...answers };
      await this.updateSession(session.id, {
        user_answers: updatedAnswers,
        status: 'confirming_requirements'
      });

      // 確認メッセージを生成
      return this.generateConfirmationMessage(updatedAnswers, session.questions);
    } catch (error) {
      console.error('Error processing user response:', error);
      return 'エラーが発生しました。もう一度お試しください。';
    }
  }

  // 回答解析（改善版）
  private static parseUserAnswers(message: string, questions: Question[]): UserAnswers {
    const answers: UserAnswers = {};
    
    // より柔軟な番号付き回答解析
    const cleanMessage = message.replace(/[　\s]+/g, ' ').trim();
    
    questions.forEach((question, index) => {
      const questionNumber = index + 1;
      
      // 複数のパターンで番号付き回答を検索
      const patterns = [
        new RegExp(`${questionNumber}[.．、]\\s*([^\\d\\n]+?)(?=\\s*[\\d]|\\.\\s*[\\d]|$)`, 'i'),
        new RegExp(`${questionNumber}\\s*[.．、]?\\s*([^\\d\\n]+?)(?=\\s*[\\d]|\\.\\s*[\\d]|$)`, 'i'),
        new RegExp(`[^\\d]${questionNumber}[.．、]\\s*([^\\d\\n]+?)(?=\\s*[\\d]|\\.\\s*[\\d]|$)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match && match[1]) {
          let answer = match[1].trim();
          // 次の番号や不要な文字を除去
          answer = answer.replace(/[２３４５６７８９].*$/, '').trim();
          answer = answer.replace(/^\d+[.．、]\s*/, '').trim();
          
          if (answer) {
            answers[question.id] = answer;
            console.log(`📝 Parsed answer ${questionNumber}: "${answer}"`);
            break;
          }
        }
      }
      
      // パターンマッチできない場合のフォールバック
      if (!answers[question.id]) {
        // 全体から関連キーワードを抽出
        const fallbackAnswer = this.extractAnswerByKeyword(cleanMessage, question, index);
        if (fallbackAnswer) {
          answers[question.id] = fallbackAnswer;
          console.log(`📝 Fallback answer ${questionNumber}: "${fallbackAnswer}"`);
        }
      }
    });

    console.log('📋 Final parsed answers:', answers);
    return answers;
  }

  // キーワードベース回答抽出（フォールバック）
  private static extractAnswerByKeyword(message: string, question: Question, index: number): string | null {
    const lowerMessage = message.toLowerCase();
    
    switch (question.id) {
      case 'task_goal':
        if (lowerMessage.includes('マークダウン') || lowerMessage.includes('markdown')) {
          return 'マークダウンレポート';
        } else if (lowerMessage.includes('csv') || lowerMessage.includes('表')) {
          return 'CSVデータ表';
        }
        break;
        
      case 'deadline':
        if (lowerMessage.includes('時間')) {
          return '1時間以内';
        } else if (lowerMessage.includes('今日') || lowerMessage.includes('当日')) {
          return '今日中';
        }
        break;
        
      case 'data_sources':
        if (lowerMessage.includes('公式') && lowerMessage.includes('ニュース')) {
          return '公式サイト、ニュースメディア';
        } else if (lowerMessage.includes('公式')) {
          return '公式サイトのみ';
        }
        break;
        
      case 'privacy_level':
        if (lowerMessage.includes('社外') || lowerMessage.includes('公開')) {
          return '社外公開可能';
        } else if (lowerMessage.includes('社内')) {
          return '社内のみ';
        }
        break;
    }
    
    return null;
  }

  // 確認メッセージ生成
  private static generateConfirmationMessage(answers: UserAnswers, questions: Question[]): string {
    let message = '## 要件確認\n\nいただいた情報を整理いたします：\n\n';
    
    questions.forEach(question => {
      const answer = answers[question.id];
      if (answer) {
        message += `- **${question.label}**: ${answer}\n`;
      } else if (question.default) {
        message += `- **${question.label}**: ${question.default}（デフォルト）\n`;
      }
    });

    message += '\n上記の内容で**JobSpec**を生成してよろしいですか？\n';
    message += '修正がある場合は具体的にお聞かせください。問題なければ「承認」または「はい」とお答えください。';

    return message;
  }

  // JobSpec生成
  static async generateJobSpec(session: SpecBuilderSession): Promise<JobSpec> {
    const answers = session.user_answers;
    
    // タスクタイプ判定
    const taskType = this.determineTaskType(session.user_request);
    
    // 成果物形式決定
    const deliverables = this.determineDeliverables(answers['task_goal'] as string);
    
    // プライバシーレベル決定
    const privacyLevel = this.determinePrivacyLevel(answers['privacy_level'] as string);
    
    // 期限ヒント生成
    const deadlineHint = this.generateDeadlineHint(answers['deadline'] as string);

    const jobSpec: JobSpec = {
      task_id: generateUuid(),
      user_intent: session.user_request,
      goal: answers['task_goal'] as string || '詳細な分析レポートの作成',
      task_type: taskType,
      deliverables,
      inputs: {
        seed_queries: this.extractSeedQueries(session.user_request),
        seed_urls: this.extractSeedUrls(answers['data_sources'] as string),
        datasets: []
      },
      constraints: {
        time_range: null,
        languages: ['ja', 'en'],
        domains_allow: [],
        domains_block: [],
        privacy: privacyLevel,
        budget_tokens: 300000,
        deadline_hint: deadlineHint
      },
      acceptance_criteria: [
        '全ての主張に適切な出典を含める',
        '日付はISO8601形式で記載',
        '読みやすい構造で整理',
        '客観的で正確な情報を提供'
      ],
      notes: [
        '推測で補完した項目は明記',
        '情報の信頼性を考慮して処理'
      ]
    };

    return jobSpec;
  }

  // タスクタイプ判定
  private static determineTaskType(userRequest: string): TaskType {
    const lowerRequest = userRequest.toLowerCase();
    
    // より具体的な判定ロジック
    if (lowerRequest.includes('調べて') || lowerRequest.includes('調査') || 
        lowerRequest.includes('リサーチ') || lowerRequest.includes('について') ||
        lowerRequest.includes('情報収集') || lowerRequest.includes('検索')) {
      return 'research';
    } else if (lowerRequest.includes('分析') || lowerRequest.includes('比較') ||
               lowerRequest.includes('評価') || lowerRequest.includes('検証')) {
      return 'analysis';
    } else if (lowerRequest.includes('作成') || lowerRequest.includes('生成') ||
               lowerRequest.includes('構築') || lowerRequest.includes('開発')) {
      return 'generation';
    } else if (lowerRequest.includes('グラフ') || lowerRequest.includes('チャート') ||
               lowerRequest.includes('可視化') || lowerRequest.includes('図表')) {
      return 'visualization';
    } else {
      // デフォルトは research（情報収集が最も一般的）
      return 'research';
    }
  }

  // 成果物形式決定
  private static determineDeliverables(taskGoal: string) {
    const deliverables = [];
    
    if (!taskGoal || taskGoal.includes('レポート') || taskGoal.includes('マークダウン')) {
      deliverables.push({
        type: 'report' as const,
        format: 'md' as const,
        schema_or_outline: ['概要', '詳細分析', '結論・提言']
      });
    }
    
    if (taskGoal?.includes('CSV') || taskGoal?.includes('表')) {
      deliverables.push({
        type: 'table' as const,
        format: 'csv' as const
      });
    }

    if (taskGoal?.includes('プレゼン')) {
      deliverables.push({
        type: 'slides' as const,
        format: 'pptx' as const
      });
    }

    return deliverables.length > 0 ? deliverables : [{
      type: 'report' as const,
      format: 'md' as const,
      schema_or_outline: ['概要', '詳細分析', '結論・提言']
    }];
  }

  // プライバシーレベル決定
  private static determinePrivacyLevel(privacyAnswer: string): PrivacyLevel {
    if (privacyAnswer?.includes('個人情報は除外')) {
      return 'no-PII';
    } else if (privacyAnswer?.includes('社内のみ')) {
      return 'internal-only';
    } else {
      return 'public-ok';
    }
  }

  // 期限ヒント生成
  private static generateDeadlineHint(deadline: string): string | null {
    const mapping: Record<string, string> = {
      '10分以内': 'PT10M',
      '1時間以内': 'PT1H',
      '今日中': 'P1D',
      '明日まで': 'P1D',
      '1週間以内': 'P7D'
    };
    
    return mapping[deadline] || null;
  }

  // シードクエリ抽出
  private static extractSeedQueries(userRequest: string): string[] {
    // 簡単なキーワード抽出
    const keywords = userRequest.match(/「([^」]+)」/g);
    return keywords ? keywords.map(k => k.replace(/[「」]/g, '')) : [];
  }

  // シードURL抽出
  private static extractSeedUrls(dataSources: string): string[] {
    if (!dataSources) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = dataSources.match(urlRegex);
    return urls || [];
  }
}