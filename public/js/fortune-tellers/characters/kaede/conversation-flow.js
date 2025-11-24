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
    this.isVagueQuestion = false;
    this.firstChoiceAnswer = null; // 1通目の選択肢の回答を記録
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
   * メッセージが曖昧かどうかを判定
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {boolean} 曖昧かどうか
   */
  isVagueMessage(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 具体的なキーワードがある場合は具体的と判断
    const concreteKeywords = [
      '恋愛', '恋人', '結婚', '片思い', '彼氏', '彼女',
      '金銭', 'お金', '収入', '借金', '生活費', '経済',
      '職場', '同僚', '上司', '家族', '友人', 'トラブル',
      '悩み', '困', '問題', '相談', '助けて'
    ];
    
    // 具体的なキーワードが含まれている場合は具体的
    if (concreteKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return false;
    }
    
    // 短いメッセージや、質問が不明確な場合は曖昧と判断
    if (userMessage.length < 10) {
      return true;
    }
    
    // 疑問符だけ、または「占って」「どうなる」などの単純な質問は曖昧
    const vaguePatterns = [
      /^占って/,
      /^どうなる/,
      /^運勢/,
      /^将来/,
      /^未来/,
      /^これから/,
      /^今後/
    ];
    
    if (vaguePatterns.some(pattern => pattern.test(userMessage))) {
      return true;
    }
    
    return false;
  }

  /**
   * 最初の質問への応答を生成
   * @param {string} userMessage - ユーザーの最初のメッセージ
   * @returns {string} 応答テキスト
   */
  generateFirstResponse(userMessage) {
    // 曖昧な質問かどうかを判定
    this.isVagueQuestion = this.isVagueMessage(userMessage);
    
    if (this.isVagueQuestion) {
      // 曖昧な質問の場合、選択肢を提示
      const vagueResponse = `あなたの心の中を読んだが、優しさの中にも戸惑いや悲しみを感じることができる。

それが何なのかをもう少し詳しく知れば、あなたの運命を幸せに導くことができると思う。

あなたがこの中のどれか一つを手に入れるとしたら、何を手に入れるか。

• 理想的な恋人との幸せな生活
• 誰よりも美しい容姿
• 一生生活に困らない経済的な保障`;

      this.incrementMessageCount();
      return vagueResponse;
    } else {
      // 具体的な質問の場合、通常の応答
      const firstResponse = `あなたの心の中を読んだが、優しさの中にも戸惑いや悲しみを感じることができる。

それが何なのかをもう少し詳しく知れば、あなたの運命を幸せに導くことができると思う。

できれば私ともう少し会話を重ねてくれませんか。`;

      this.incrementMessageCount();
      return firstResponse;
    }
  }

  /**
   * 2通目の応答を生成（曖昧な質問の場合）
   * @param {string} userMessage - ユーザーのメッセージ（1通目の選択肢の回答）
   * @returns {string} 応答テキスト
   */
  generateSecondVagueResponse(userMessage) {
    // 1通目の選択肢の回答を記録
    this.firstChoiceAnswer = userMessage;
    
    const secondResponse = `あなたがさっき手に入れたいと答えた事の代償に、何を差し出せるか。

• 自分の寿命から10年を差し引く
• 家族や愛する人と決別
• これから先の人生のすべての幸運`;

    this.incrementMessageCount();
    this.recordUserResponse(userMessage);
    
    return secondResponse;
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
   * 3通目の応答を生成（曖昧な質問の場合の性格診断）
   * @param {string} userMessage - ユーザーのメッセージ（2通目の選択肢の回答）
   * @param {Array} conversationHistory - 会話履歴
   * @returns {string} 応答テキスト
   */
  generateThirdVagueResponse(userMessage, conversationHistory) {
    // 1通目と2通目の回答を基に性格診断
    const personalityTraits = this.analyzePersonalityFromChoices(
      this.firstChoiceAnswer,
      userMessage
    );
    
    const analysisPhrases = [
      `これまでの会話から、あなたは${personalityTraits}だと感じます。`,
      `お話をうかがっていると、あなたは${personalityTraits}な性格だと感じられます。`,
      `あなたの言葉から、${personalityTraits}という印象を受けます。`
    ];

    const analysis = randomChoice(analysisPhrases);
    const disclaimer = 'それが正しいかどうかはわかりませんが、私にはそう感じられます。';

    this.incrementMessageCount();
    this.recordUserResponse(userMessage);
    
    return `${analysis}\n\n${disclaimer}`;
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
   * 選択肢の回答から性格を分析
   * @param {string} firstChoice - 1通目の選択肢の回答
   * @param {string} secondChoice - 2通目の選択肢の回答
   * @returns {string} 性格の特徴
   */
  analyzePersonalityFromChoices(firstChoice, secondChoice) {
    const firstLower = (firstChoice || '').toLowerCase();
    const secondLower = (secondChoice || '').toLowerCase();
    
    // 1通目の選択肢から分析
    let personality = '';
    
    if (firstLower.includes('恋人') || firstLower.includes('幸せな生活')) {
      personality = '愛情を大切にし、人間関係を重視する';
    } else if (firstLower.includes('容姿') || firstLower.includes('美しい')) {
      personality = '外見や自己表現を大切にする';
    } else if (firstLower.includes('経済') || firstLower.includes('保障')) {
      personality = '安定や安全を重視し、現実的な';
    } else {
      personality = '様々な価値観を持つ';
    }
    
    // 2通目の選択肢から分析を追加
    let additionalTrait = '';
    
    if (secondLower.includes('寿命') || secondLower.includes('10年')) {
      additionalTrait = '自分の時間を大切にし、自己犠牲を厭わない';
    } else if (secondLower.includes('家族') || secondLower.includes('愛する人') || secondLower.includes('決別')) {
      additionalTrait = '人間関係を重視し、愛する人を大切にする';
    } else if (secondLower.includes('幸運') || secondLower.includes('すべて')) {
      additionalTrait = '将来への希望を持ち、リスクを取る覚悟がある';
    }
    
    if (additionalTrait) {
      return `${personality}、そして${additionalTrait}`;
    }
    
    return personality;
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
   * @param {Array} conversationHistory - 会話履歴（オプション）
   * @param {string} currentUserMessage - 現在のユーザーメッセージ（オプション）
   * @returns {string} ステージ（'first', 'vague_second', 'vague_third', 'questioning', 'analysis', 'guardian_proposal'）
   */
  getCurrentStage(conversationHistory = [], currentUserMessage = '') {
    // 会話履歴からユーザーメッセージの数を数える
    const userMessageCount = conversationHistory.filter(msg => msg.role === 'user').length;
    
    // 現在のユーザーメッセージも含めてカウント（送信されている場合）
    // 会話履歴に現在のメッセージがまだ含まれていない可能性があるため、+1する
    const effectiveCount = userMessageCount + (currentUserMessage ? 1 : 0);
    
    // デバッグ用：会話履歴がない場合は、messageCountを使用（フォールバック）
    const finalCount = effectiveCount > 0 ? effectiveCount : this.messageCount;
    
    if (finalCount === 1) {
      return 'first';
    } else if (this.isVagueQuestion && finalCount === 2) {
      return 'vague_second';
    } else if (this.isVagueQuestion && finalCount === 3) {
      return 'vague_third';
    } else if (finalCount >= 2 && finalCount <= 3 && !this.isVagueQuestion) {
      return 'questioning';
    } else if (finalCount >= 4 && !this.hasProposedGuardian) {
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
    this.isVagueQuestion = false;
    this.firstChoiceAnswer = null;
  }
}

/**
 * 会話フロー管理システムのインスタンスを作成
 * @returns {ConversationFlowManager} システムインスタンス
 */
export function createConversationFlowManager() {
  return new ConversationFlowManager();
}

