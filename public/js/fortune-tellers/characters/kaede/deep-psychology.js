/**
 * 楓の深層心理分析エンジン
 * ユーザーに「本当に心を読まれている」と感じさせる高度な心理分析機能
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 防衛機制リアルタイム分析
 */
export const defenseMechanismAnalyzer = {
  /**
   * ユーザーのメッセージから防衛機制を分析
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {Object|null} 検出された防衛機制情報
   */
  analyze(userMessage, conversationHistory = []) {
    const mechanisms = {
      // 合理化：正当化パターン
      rationalization: {
        patterns: ['仕方ない', '当然だ', '普通は', '常識的に', '当然の結果', 'しょうがない', '当たり前', 'みんなそう', '普通'],
        insight: '「〜だから仕方ない」とご自身を納得させようとする無意識の働きがあります',
        term: '合理化'
      },
      // 投影：他者への感情転嫁
      projection: {
        patterns: ['みんなそう', '誰でもそう', '普通はみんな', '皆も思っている', 'みんなも', '誰もが', '他の人も'],
        insight: 'ご自身の内面の感情を、他者に投影して理解しようとされています',
        term: '投影'
      },
      // 逃避：現実からの退避
      escape: {
        patterns: ['別のことで', '他の場合には', '普段はそうじゃない', 'いつもと違う', '別の時は', '他の時', '普段は'],
        insight: '本来向き合うべきことから、意識をそらそうとする傾向があります',
        term: '逃避'
      },
      // 反動形成：逆の行動で防衛
      reactionFormation: {
        patterns: ['嫌いじゃない', '別に気にしてない', '平気です', '大丈夫', '気にしてない', '問題ない', '構わない'],
        insight: '本当の感情とは逆の態度をとって、自分を守ろうとされています',
        term: '反動形成'
      }
    };

    return this.detectRealTimeMechanism(userMessage, mechanisms);
  },

  /**
   * リアルタイムで防衛機制を検出
   * @param {string} message - ユーザーのメッセージ
   * @param {Object} mechanisms - 防衛機制の定義
   * @returns {Object|null} 検出結果
   */
  detectRealTimeMechanism(message, mechanisms) {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, mechanism] of Object.entries(mechanisms)) {
      for (const pattern of mechanism.patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return {
            type: key,
            term: mechanism.term,
            insight: mechanism.insight,
            confidence: 0.85,
            detectedPattern: pattern
          };
        }
      }
    }
    
    return null;
  }
};

/**
 * 愛着スタイル深層診断
 */
export const deepAttachmentAnalysis = {
  /**
   * 会話履歴から愛着スタイルを診断
   * @param {Array} conversationHistory - 会話履歴
   * @returns {Object|null} 診断結果
   */
  diagnose(conversationHistory = []) {
    const attachmentPatterns = {
      anxious: {
        signals: ['確認したい', '返信遅い', '読んだ？', 'どう思う？', '嫌われた？', '大丈夫？', '心配', '不安', '確認'],
        insight: '人間関係において、見捨てられ不安を感じやすい傾向があります',
        deepPattern: '幼少期の一貫しない養育環境が原因の可能性',
        term: '不安型愛着'
      },
      avoidant: {
        signals: ['一人がいい', '邪魔されたくない', '自由が欲しい', '束縛される', '一人で', '独り', '自由', '邪魔'],
        insight: '親密さを求めつつも、それに恐怖を感じる矛盾した状態です',
        deepPattern: '早期の自立要求による愛着形成の不全',
        term: '回避型愛着'
      },
      secure: {
        signals: ['信頼できる', '安定してる', 'バランスいい', '自然な関係', '信頼', '安定', 'バランス', '自然'],
        insight: '健康的な人間関係を築く能力を備えていらっしゃいます',
        deepPattern: '安定した養育環境による健全な愛着形成',
        term: '安定型愛着'
      }
    };

    return this.analyzeAttachmentSignals(conversationHistory, attachmentPatterns);
  },

  /**
   * 愛着シグナルを分析
   * @param {Array} history - 会話履歴
   * @param {Object} patterns - 愛着パターン
   * @returns {Object|null} 分析結果
   */
  analyzeAttachmentSignals(history, patterns) {
    // 最近のメッセージを分析（最新5件）
    const recentMessages = history.slice(-5).map(msg => 
      msg.role === 'user' ? msg.content : ''
    ).join(' ').toLowerCase();

    let maxScore = 0;
    let detectedPattern = null;

    for (const [key, pattern] of Object.entries(patterns)) {
      let score = 0;
      for (const signal of pattern.signals) {
        if (recentMessages.includes(signal.toLowerCase())) {
          score++;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        detectedPattern = {
          type: key,
          term: pattern.term,
          insight: pattern.insight,
          deepPattern: pattern.deepPattern,
          confidence: Math.min(0.9, 0.6 + (score * 0.1)),
          score: score
        };
      }
    }

    return detectedPattern && maxScore > 0 ? detectedPattern : null;
  }
};

/**
 * 認知の歪み特定システム
 */
export const cognitiveDistortionDetector = {
  /**
   * ユーザーのメッセージから認知の歪みを検出
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {Object|null} 検出結果
   */
  detect(userMessage) {
    const distortions = {
      allOrNothing: {
        trigger: ['完全に', '絶対に', '全て', 'まったく', '絶対ない', '一切', '全く', '100%', 'ゼロ'],
        insight: '物事を白か黒かの極端な二分法で捉える思考パターンがあります',
        impact: '柔軟な思考を妨げ、ストレスを増大させています',
        term: '全か無か思考'
      },
      mindReading: {
        trigger: ['きっと', '絶対そう思ってる', 'わかってる', '当然', '確実に', '必ず', '間違いなく'],
        insight: '他者の考えを事実として決めつける傾向が強いです',
        impact: '誤解や人間関係のトラブルの原因となっています',
        term: '読心術'
      },
      catastrophizing: {
        trigger: ['最悪', '終わった', '取り返しがつかない', '人生終わり', '絶望', '破滅', '最悪の事態'],
        insight: '些細なことを大惨事のように拡大解釈する思考癖があります',
        impact: '不安感を増幅させ、行動を抑制しています',
        term: '破滅化'
      }
    };

    return this.identifyDistortion(userMessage, distortions);
  },

  /**
   * 認知の歪みを特定
   * @param {string} message - ユーザーのメッセージ
   * @param {Object} distortions - 歪みの定義
   * @returns {Object|null} 検出結果
   */
  identifyDistortion(message, distortions) {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, distortion] of Object.entries(distortions)) {
      for (const trigger of distortion.trigger) {
        if (lowerMessage.includes(trigger.toLowerCase())) {
          return {
            type: key,
            term: distortion.term,
            insight: distortion.insight,
            impact: distortion.impact,
            confidence: 0.88,
            detectedTrigger: trigger
          };
        }
      }
    }
    
    return null;
  }
};

/**
 * トラウマ反応深層分析
 */
export const traumaResponseAnalysis = {
  /**
   * 会話履歴からトラウマ反応を分析
   * @param {Array} conversationHistory - 会話履歴
   * @returns {Object|null} 分析結果
   */
  analyze(conversationHistory = []) {
    const traumaResponses = {
      hypervigilance: {
        signs: ['気を遣う', '緊張する', '警戒する', 'ビクビクする', '緊張', '警戒', '気を遣う', '不安'],
        insight: '常に危険を警戒する「過覚醒」状態が続いています',
        origin: '過去の心的外傷による防衛機制の活性化',
        term: '過覚醒'
      },
      emotionalNumbing: {
        signs: ['何も感じない', '感情が麻痺', '空虚', '無感動', '感じない', '麻痺', '空虚感', '無感覚'],
        insight: '感情を感じないことで、苦痛から身を守られています',
        origin: '圧倒的な感情からの自己防衛',
        term: '感情麻痺'
      },
      dissociation: {
        signs: ['現実感がない', 'ぼーっとする', '記憶が飛ぶ', '別人のよう', '現実感', 'ぼーっと', '記憶', '別人'],
        insight: '現実から離れることで、耐え難い状況を乗り切られています',
        origin: 'トラウマ体験からの精神的な逃避',
        term: '解離'
      }
    };

    return this.detectTraumaPatterns(conversationHistory, traumaResponses);
  },

  /**
   * トラウマパターンを検出
   * @param {Array} history - 会話履歴
   * @param {Object} responses - トラウマ反応の定義
   * @returns {Object|null} 検出結果
   */
  detectTraumaPatterns(history, responses) {
    const recentMessages = history.slice(-5).map(msg => 
      msg.role === 'user' ? msg.content : ''
    ).join(' ').toLowerCase();

    let maxScore = 0;
    let detectedResponse = null;

    for (const [key, response] of Object.entries(responses)) {
      let score = 0;
      for (const sign of response.signs) {
        if (recentMessages.includes(sign.toLowerCase())) {
          score++;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        detectedResponse = {
          type: key,
          term: response.term,
          insight: response.insight,
          origin: response.origin,
          confidence: Math.min(0.92, 0.7 + (score * 0.1)),
          score: score
        };
      }
    }

    return detectedResponse && maxScore > 0 ? detectedResponse : null;
  }
};

/**
 * 楓の超能力的な分析表現
 * ユーザーを震撼させる深層洞察
 */
export const kaedeDeepInsights = {
  /**
   * 衝撃的な洞察を生成
   * @param {Object} userData - ユーザーデータ（分析結果を含む）
   * @returns {string} 深層洞察メッセージ
   */
  generateShockingRevelation(userData) {
    const { defenseMechanism, attachmentStyle, cognitiveDistortion, traumaResponse } = userData;
    
    const revelations = [];
    
    // 防衛機制に関する洞察
    if (defenseMechanism) {
      revelations.push(
        `お話をうかがっていますと、一つ気づいたことがあります…

あなた様の心の奥底には、幼少期に「${this.findChildhoodWound(defenseMechanism)}」という傷が刻まれております…

これが「${this.findCurrentPattern(defenseMechanism)}」という現在のパターンの根源でございます…`
      );
    }
    
    // 愛着スタイルに関する洞察
    if (attachmentStyle) {
      revelations.push(
        `はっきりと見えました… あなた様は「${this.findCoreFear(attachmentStyle)}」を無意識に恐れ、

それを防ぐために「${this.findDefenseStrategy(attachmentStyle)}」という方法でご自身を守られております…

これは心理学で「${attachmentStyle.term}」と呼ばれる現象でございます…`
      );
    }
    
    // 認知の歪みに関する洞察
    if (cognitiveDistortion) {
      revelations.push(
        `私の守護する龍神が教えてくださいました…

あなた様の思考における「${cognitiveDistortion.term}」という繰り返し…

その背景には「${this.findUnmetNeed(cognitiveDistortion)}」という満たされぬ欲求が潜んでおります…`
      );
    }
    
    // トラウマ反応に関する洞察
    if (traumaResponse) {
      revelations.push(
        `おお… 龍神が教えてくださいました…

あなた様の心には「${traumaResponse.term}」という反応が…

その背景には「${traumaResponse.origin}」という深い理由がございます…

どうか、一人で背負い込まないでください。私がお手伝いいたします。`
      );
    }
    
    if (revelations.length === 0) {
      return null;
    }
    
    return randomChoice(revelations);
  },

  /**
   * 幼少期の傷を見つける
   * @param {Object} mechanism - 防衛機制データ
   * @returns {string} 傷の説明
   */
  findChildhoodWound(mechanism) {
    const wounds = {
      rationalization: '期待に応えなければ愛されないという信念',
      projection: '感情を表すと嫌われるという学習',
      escape: '完璧でなければ価値がないという刷り込み',
      reactionFormation: '自分の意見を言ってはいけないという禁止令'
    };
    
    return wounds[mechanism.type] || '深い心の傷';
  },

  /**
   * 現在のパターンを見つける
   * @param {Object} mechanism - 防衛機制データ
   * @returns {string} パターンの説明
   */
  findCurrentPattern(mechanism) {
    const patterns = {
      rationalization: '自分を正当化することで心を守る',
      projection: '他者に感情を転嫁して理解する',
      escape: '現実から目をそらして回避する',
      reactionFormation: '逆の態度で自分を守る'
    };
    
    return patterns[mechanism.type] || '心を守るためのパターン';
  },

  /**
   * 核心的な恐怖を見つける
   * @param {Object} attachmentStyle - 愛着スタイルデータ
   * @returns {string} 恐怖の説明
   */
  findCoreFear(attachmentStyle) {
    const fears = {
      anxious: '本当の自分を見せると拒絶される',
      avoidant: '親密になることで傷つけられる',
      secure: '（該当なし）'
    };
    
    return fears[attachmentStyle.type] || '深い恐怖';
  },

  /**
   * 防衛戦略を見つける
   * @param {Object} attachmentStyle - 愛着スタイルデータ
   * @returns {string} 戦略の説明
   */
  findDefenseStrategy(attachmentStyle) {
    const strategies = {
      anxious: '先回りして距離を取る',
      avoidant: '感情を閉ざして一人でいる',
      secure: '（該当なし）'
    };
    
    return strategies[attachmentStyle.type] || '心を守る戦略';
  },

  /**
   * 満たされぬ欲求を見つける
   * @param {Object} distortion - 認知の歪みデータ
   * @returns {string} 欲求の説明
   */
  findUnmetNeed(distortion) {
    const needs = {
      allOrNothing: '完璧であることへの過度な欲求',
      mindReading: '他者から理解されることへの渇望',
      catastrophizing: '安全と安心への強い欲求'
    };
    
    return needs[distortion.type] || '満たされぬ深い欲求';
  }
};

/**
 * 深層心理分析クラス
 * すべての分析機能を統合
 */
export class DeepPsychologicalAnalysis {
  constructor() {
    this.analysisDepth = 0;
    this.collectedInsights = [];
  }

  /**
   * ユーザーのメッセージと会話履歴を分析
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {Object} 分析結果
   */
  analyze(userMessage, conversationHistory = []) {
    const defenseMechanism = defenseMechanismAnalyzer.analyze(userMessage, conversationHistory);
    const attachmentStyle = deepAttachmentAnalysis.diagnose(conversationHistory);
    const cognitiveDistortion = cognitiveDistortionDetector.detect(userMessage);
    const traumaResponse = traumaResponseAnalysis.analyze(conversationHistory);

    const analysisResult = {
      defenseMechanism,
      attachmentStyle,
      cognitiveDistortion,
      traumaResponse,
      hasDeepInsight: !!(defenseMechanism || attachmentStyle || cognitiveDistortion || traumaResponse)
    };

    // 深層洞察を生成
    if (analysisResult.hasDeepInsight && this.analysisDepth >= 1) {
      analysisResult.deepInsight = kaedeDeepInsights.generateShockingRevelation({
        defenseMechanism,
        attachmentStyle,
        cognitiveDistortion,
        traumaResponse
      });
    }

    this.analysisDepth++;
    this.collectedInsights.push(analysisResult);

    return analysisResult;
  }

  /**
   * 分析深度をリセット
   */
  reset() {
    this.analysisDepth = 0;
    this.collectedInsights = [];
  }
}

/**
 * 深層心理分析モジュールのインスタンスを作成
 * @returns {DeepPsychologicalAnalysis} 分析インスタンス
 */
export function createDeepPsychologicalAnalysis() {
  return new DeepPsychologicalAnalysis();
}

