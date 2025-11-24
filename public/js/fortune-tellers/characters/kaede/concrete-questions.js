/**
 * 相談別の具体的質問システム
 * ユーザーの相談内容に応じて、具体的な質問を生成
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 経済的相談の質問テンプレート
 */
const financialQuestions = {
  // 借入金の有無と金額
  debtInquiry: {
    question: "お辛いお気持ち、よくわかります。\n\n現在、借入金はおありですか？",
    followUps: {
      hasDebt: "おいくらくらいの借入金ですか？\n（大体の金額で結構です）",
      noDebt: "では、現在の収入と支出のバランスについて教えていただけますか？"
    }
  },
  
  // 収入アップの目標
  incomeGoal: {
    question: "月々あとどれくらい収入が増えれば楽になれそうですか？",
    examples: [
      "• あと3万円ほどあれば…",
      "• 5万円増えたら…", 
      "• 現在の1.5倍くらい…",
      "• 10万円以上欲しい…"
    ]
  },
  
  // 現在の収入源
  incomeSources: {
    question: "現在の主な収入源は何ですか？",
    options: [
      "A. 年金のみ",
      "B. パート・アルバイト",
      "C. フリーランス",
      "D. 失業中",
      "E. その他"
    ]
  }
};

/**
 * 恋愛相談の質問テンプレート
 */
const relationshipQuestions = {
  // 現在の恋愛状況
  currentStatus: {
    question: "恋愛のお悩みですね。\n\n現在、恋人はいらっしゃいますか？",
    followUps: {
      hasPartner: "その方との関係で、どんなことでお悩みですか？",
      noPartner: "では、どのような恋人をお探しですか？\n性格や年齢、価値観など、具体的に教えてください。"
    }
  },
  
  // 理想の恋人像
  idealPartner: {
    question: "具体的にどんなタイプの方がいいと思いますか？",
    aspects: [
      "性格面（明るい、優しい、真面目など）",
      "年齢や職業", 
      "共通の趣味や価値観",
      "生活スタイル"
    ]
  },
  
  // 片思いの場合
  crushSituation: {
    question: "好きな方がいらっしゃる場合は、どんな間柄の方ですか？",
    options: [
      "職場の同僚",
      "学生時代の知人", 
      "友人関係",
      "SNSで知り合った方",
      "その他"
    ]
  }
};

/**
 * 人間関係相談の質問テンプレート
 */
const interpersonalQuestions = {
  // 問題の人物特定
  problemPerson: {
    question: "人間関係のお悩み、辛いですね。\n\n最も関わりたくないとお感じの方は、どのような立場の方ですか？",
    options: [
      "職場の上司",
      "同僚", 
      "家族・親戚",
      "友人",
      "近所の方",
      "その他"
    ]
  },
  
  // 具体的な理由
  reasonForDiscomfort: {
    question: "その方のどんなところが辛いと感じますか？",
    examples: [
      "言動や態度",
      "価値観の違い", 
      "過去のトラブル",
      "性格の不一致",
      "その他"
    ]
  },
  
  // 状況の詳細
  situationDetails: {
    question: "具体的にどんなことが起きて、嫌だと思われましたか？\n最近の具体的なエピソードがあれば教えてください。"
  }
};

/**
 * 相談タイプを判定するキーワード
 */
const consultationKeywords = {
  financial: ['金銭', 'お金', '収入', '借金', '生活費', '経済', '給料', '借入', '返済', '貯金', '生活が厳しい', '生活が苦しい', '経済的', '金銭的', '貧乏', 'お金がない', '生活が苦しい'],
  relationship: ['恋愛', '恋人', '好き', '結婚', 'デート', '片思い', '彼氏', '彼女', '交際', '付き合い', '別れ', '復縁', '出会い', '婚活'],
  interpersonal: ['人間関係', '職場', '同僚', '上司', '部下', '友人', '家族', 'トラブル', 'いじめ', '嫌がらせ', 'パワハラ', 'セクハラ', '関係', '仲が悪い', '合わない']
};

/**
 * 具体的質問生成システム
 */
export class ConcreteQuestioningSystem {
  constructor() {
    this.questionHistory = [];
  }

  /**
   * 相談タイプを判定
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 相談タイプ（financial, relationship, interpersonal, general）
   */
  determineQuestionType(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const [type, keywords] of Object.entries(consultationKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        return type;
      }
    }
    
    return 'general';
  }

  /**
   * 相談タイプに応じた具体的な質問を生成
   * @param {string} questionType - 相談タイプ
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {string} 具体的な質問
   */
  generateSpecificQuestions(questionType, userMessage = '', conversationHistory = []) {
    // 既に質問した内容を確認
    const recentQuestions = this.questionHistory.slice(-3);
    
    switch (questionType) {
      case 'financial':
        return this.generateFinancialQuestion(userMessage, recentQuestions);
      
      case 'relationship':
        return this.generateRelationshipQuestion(userMessage, recentQuestions);
      
      case 'interpersonal':
        return this.generateInterpersonalQuestion(userMessage, recentQuestions);
      
      default:
        return this.generateGeneralQuestion(userMessage);
    }
  }

  /**
   * 経済的相談の質問を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} recentQuestions - 最近の質問履歴
   * @returns {string} 質問
   */
  generateFinancialQuestion(userMessage, recentQuestions) {
    // 借入金について質問していない場合
    if (!recentQuestions.some(q => q.includes('借入金') || q.includes('借金'))) {
      const question = financialQuestions.debtInquiry.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 収入源について質問していない場合
    if (!recentQuestions.some(q => q.includes('収入源'))) {
      const question = financialQuestions.incomeSources.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 収入目標について質問していない場合
    if (!recentQuestions.some(q => q.includes('収入が増えれば'))) {
      const question = financialQuestions.incomeGoal.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // すべて質問済みの場合、追加の質問
    return "もう少し詳しく教えていただけますか？\n例えば、現在の生活で最も困っていることは何ですか？";
  }

  /**
   * 恋愛相談の質問を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} recentQuestions - 最近の質問履歴
   * @returns {string} 質問
   */
  generateRelationshipQuestion(userMessage, recentQuestions) {
    // 現在の恋愛状況について質問していない場合
    if (!recentQuestions.some(q => q.includes('恋人') || q.includes('恋人は'))) {
      const question = relationshipQuestions.currentStatus.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 理想の恋人像について質問していない場合
    if (!recentQuestions.some(q => q.includes('タイプ') || q.includes('どのような'))) {
      const question = relationshipQuestions.idealPartner.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 片思いの場合の質問
    if (userMessage.includes('好き') || userMessage.includes('片思い')) {
      if (!recentQuestions.some(q => q.includes('間柄'))) {
        const question = relationshipQuestions.crushSituation.question;
        this.questionHistory.push(question);
        return question;
      }
    }
    
    // すべて質問済みの場合、追加の質問
    return "もう少し詳しく教えていただけますか？\n例えば、恋愛で最も困っていることは何ですか？";
  }

  /**
   * 人間関係相談の質問を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} recentQuestions - 最近の質問履歴
   * @returns {string} 質問
   */
  generateInterpersonalQuestion(userMessage, recentQuestions) {
    // 問題の人物について質問していない場合
    if (!recentQuestions.some(q => q.includes('立場') || q.includes('関わりたくない'))) {
      const question = interpersonalQuestions.problemPerson.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 具体的な理由について質問していない場合
    if (!recentQuestions.some(q => q.includes('辛い') || q.includes('どんなところ'))) {
      const question = interpersonalQuestions.reasonForDiscomfort.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // 状況の詳細について質問していない場合
    if (!recentQuestions.some(q => q.includes('具体的') || q.includes('エピソード'))) {
      const question = interpersonalQuestions.situationDetails.question;
      this.questionHistory.push(question);
      return question;
    }
    
    // すべて質問済みの場合、追加の質問
    return "もう少し詳しく教えていただけますか？\n例えば、その関係で最も困っていることは何ですか？";
  }

  /**
   * 一般的な質問を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 質問
   */
  generateGeneralQuestion(userMessage) {
    const generalQuestions = [
      "もう少し詳しくお話ししていただけますか？",
      "具体的に、どんなことでお悩みですか？",
      "どのような状況でお困りですか？",
      "お気持ちについて、もう少し詳しくお聞かせいただけますでしょうか？"
    ];
    
    return randomChoice(generalQuestions);
  }

  /**
   * 質問履歴をリセット
   */
  resetHistory() {
    this.questionHistory = [];
  }
}

/**
 * 具体的質問システムのインスタンスを作成
 * @returns {ConcreteQuestioningSystem} システムインスタンス
 */
export function createConcreteQuestioningSystem() {
  return new ConcreteQuestioningSystem();
}

