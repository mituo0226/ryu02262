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
    const vague = this.isVagueMessage(userMessage);
    const empatheticOpeners = [
      '（そっと微笑みながら）あなたの心には、誰にも言えなかった迷いがあるように感じます。',
      '（優しい眼差しで）伝わってくる静けさの奥に、揺れている想いがありますね。',
      '（穏やかに頷きながら）言葉にはならない感情が、今も胸の奥でざわめいているのを感じます。'
    ];
    const followUpsForVague = [
      '恋愛、人間関係、そしてお金の不安。そのうちどこからお話しするのが楽でしょうか？',
      '一番重たく感じる出来事を、できる範囲で教えてもらえますか？',
      '最近、心が強く反応した瞬間はどんな時だったでしょう。そこから紐解きましょうか。'
    ];
    const followUpsForConcrete = [
      'お話しいただいた内容から、さらに詳しく知っておきたい点があります。差し支えなければ教えてください。',
      'いただいたご相談を受けて、状況をもう少しだけ具体的に知りたいと思いました。',
      '気持ちを整理するために、今の出来事を一緒に丁寧に辿ってみましょう。'
    ];

    const opener = randomChoice(empatheticOpeners);
    const followUp = vague
      ? randomChoice(followUpsForVague)
      : randomChoice(followUpsForConcrete);

    this.incrementMessageCount();
    return `${opener}\n\n${followUp}`;
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
    } else if (finalCount >= 2 && finalCount <= 3) {
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
  }
}

/**
 * 会話フロー管理システムのインスタンスを作成
 * @returns {ConversationFlowManager} システムインスタンス
 */
export function createConversationFlowManager() {
  return new ConversationFlowManager();
}

