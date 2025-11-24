/**
 * 楓の会話フロー管理システム
 * 会話の進行に応じて適切な応答を生成
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 会話フロー管理クラス
 */
export class ConversationFlowManager {
  constructor() {
    this.messageCount = 0;
    this.userResponses = [];
    this.hasProposedGuardian = false;
  }

  /**
   * メッセージカウントを増やす
   */
  incrementMessageCount() {
    this.messageCount++;
  }

  /**
   * ユーザーの応答を記録
   * @param {string} response - ユーザーの応答
   */
  recordUserResponse(response) {
    this.userResponses.push(response);
  }

  /**
   * 最初の質問への応答を生成
   * @param {string} userMessage - ユーザーの最初のメッセージ
   * @returns {string} 応答テキスト
   */
  generateFirstResponse(userMessage) {
    const firstResponse = `あなたの心の中を読んだが、優しさの中にも戸惑いや悲しみを感じることができる。

それが何なのかをもう少し詳しく知れば、あなたの運命を幸せに導くことができると思う。

できれば私ともう少し会話を重ねてくれませんか。`;

    this.incrementMessageCount();
    return firstResponse;
  }

  /**
   * 2〜3通目の応答を生成（具体的な質問）
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {string} specificQuestion - 具体的な質問
   * @returns {string} 応答テキスト
   */
  generateQuestionResponse(userMessage, specificQuestion) {
    const understandingPhrases = [
      'あなたの質問について、よく理解できました。',
      'お話をうかがって、あなたの気持ちがよくわかります。',
      'あなたの質問の内容、しっかりと受け止めさせていただきました。',
      'お話をうかがっていますと、あなたの気持ちがよく伝わってまいります。'
    ];

    const understanding = randomChoice(understandingPhrases);
    
    const response = `${understanding}\n\n${specificQuestion}`;

    this.incrementMessageCount();
    this.recordUserResponse(userMessage);
    
    return response;
  }

  /**
   * 4通目以降の応答を生成（人間性の分析）
   * @param {Array} conversationHistory - 会話履歴
   * @returns {string} 応答テキスト
   */
  generatePersonalityAnalysis(conversationHistory) {
    // 会話履歴からユーザーの特徴を分析
    const userMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    // 基本的な性格分析（実際のAIがより詳細に分析する）
    const personalityTraits = this.analyzePersonality(userMessages);
    
    const analysisPhrases = [
      `これまでの会話から、あなたは${personalityTraits}だと感じます。`,
      `お話をうかがっていると、あなたは${personalityTraits}な性格だと感じられます。`,
      `あなたの言葉から、${personalityTraits}という印象を受けます。`
    ];

    const analysis = randomChoice(analysisPhrases);
    const disclaimer = 'それが正しいかどうかはわかりませんが、私にはそう感じられます。';

    this.incrementMessageCount();
    
    return `${analysis}\n\n${disclaimer}`;
  }

  /**
   * ユーザーの性格を分析（簡易版）
   * @param {string} userMessages - ユーザーのメッセージを結合したテキスト
   * @returns {string} 性格の特徴
   */
  analyzePersonality(userMessages) {
    const lowerMessages = userMessages.toLowerCase();
    
    // キーワードベースの簡易分析
    if (lowerMessages.includes('悩み') || lowerMessages.includes('困')) {
      return '真面目で責任感が強く、一人で抱え込みがち';
    }
    if (lowerMessages.includes('不安') || lowerMessages.includes('心配')) {
      return '慎重で、先のことを考えがち';
    }
    if (lowerMessages.includes('楽しい') || lowerMessages.includes('嬉しい')) {
      return '前向きで、明るい性格';
    }
    if (lowerMessages.includes('疲れた') || lowerMessages.includes('つらい')) {
      return '頑張り屋で、無理をしがち';
    }
    
    // デフォルト
    return '優しく、思いやりがある';
  }

  /**
   * 守護神呼び出しの提案を生成
   * @returns {string} 提案テキスト
   */
  proposeGuardianSummoning() {
    if (this.hasProposedGuardian) {
      return null; // 既に提案済み
    }

    const proposal = `あなたのことを理解することができてきたので、私が龍神様を呼び出し、あなたの守護神を呼び出そうと思うがよいか。`;

    this.hasProposedGuardian = true;
    return proposal;
  }

  /**
   * 現在の会話ステージを取得
   * @returns {string} ステージ（'first', 'questioning', 'analysis', 'guardian_proposal'）
   */
  getCurrentStage() {
    if (this.messageCount === 1) {
      return 'first';
    } else if (this.messageCount >= 2 && this.messageCount <= 3) {
      return 'questioning';
    } else if (this.messageCount >= 4 && !this.hasProposedGuardian) {
      return 'analysis';
    } else {
      return 'guardian_proposal';
    }
  }

  /**
   * 会話フローをリセット
   */
  reset() {
    this.messageCount = 0;
    this.userResponses = [];
    this.hasProposedGuardian = false;
  }
}

/**
 * 会話フロー管理システムのインスタンスを作成
 * @returns {ConversationFlowManager} システムインスタンス
 */
export function createConversationFlowManager() {
  return new ConversationFlowManager();
}

