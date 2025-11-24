/**
 * 応答テンプレート
 * 楓の応答パターンと不適切ユーザー対応
 */
import { randomChoice, replaceTemplate } from '../../utils/helpers.js';
import { createValidator } from '../../utils/validators.js';
import { createConcreteQuestioningSystem } from './concrete-questions.js';
import { createFortuneTellingModule } from './fortune-telling.js';
import { createConversationFlowManager } from './conversation-flow.js';

/**
 * 通常の応答テンプレート（優しい敬語で紳士的に）
 */
const normalResponses = [
  'お話をうかがわせていただき、ありがとうございます。{message}について、一緒に考えていきましょう。',
  'ご相談の内容、よく理解いたしました。{message}について、穏やかに見守らせていただきます。',
  'ありがとうございます。{message}について、お役に立てるよう、精一杯お手伝いさせていただきます。',
  'ご相談いただき、感謝いたします。{message}について、心を込めてお答えいたします。',
];

/**
 * 不適切なユーザーへの応答テンプレート（優しい敬語で紳士的に）
 */
const inappropriateResponses = [
  '申し訳ございませんが、そのようなご相談にはお答えできません。穏やかな日常を大切にすることが、何よりの幸福の道だと私は考えております。',
  'そのような内容のご相談は、お受けすることができません。悪用される危険をはらむものは、決して扱うことができないのです。',
  '申し訳ございませんが、そのようなご相談には対応いたしかねます。一般市民として、正しい道を歩むことが大切だと私は考えております。',
  'もしよろしければ、別の形でお手伝いできることがあるかもしれません。穏やかな日常を守ることが、私の務めでございます。',
];

/**
 * 優しい応答テンプレート（紳士的な敬語で）
 */
const gentleResponses = [
  'どうか、無理をなさらないでください。あなた様のペースで、ゆっくりと進んでいきましょう。',
  '大丈夫です。一人で抱え込まないでください。一緒に考えていきましょう。',
  'あなた様のお気持ち、よくわかります。焦らず、一歩ずつ進んでいきましょう。',
  'どうか、ご自身を責めないでください。あなた様は、あなた様のままで十分に素晴らしいのです。',
  'おつらいお気持ち、よくわかります。どうか一人で背負い込まないでください。',
  '大変な思いをなさっているのですね。あなた様のそのお気持ち、大切に受け止めさせていただきます。',
  '安心してください。ここでは、どんなお話も温かくお聞きいたします。',
];

/**
 * 応答生成クラス
 */
export class ResponseModule {
  constructor() {
    this.validator = createValidator();
    this.questioningSystem = createConcreteQuestioningSystem();
    this.fortuneTellingModule = createFortuneTellingModule();
    this.flowManager = createConversationFlowManager();
  }

  /**
   * 通常の応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(userMessage = '') {
    const template = randomChoice(normalResponses);
    return replaceTemplate(template, { message: userMessage });
  }

  /**
   * 不適切なユーザーへの応答を生成
   * @param {Array<string>} inappropriateKeywords - 検出された不適切なキーワード
   * @returns {string} 応答テキスト
   */
  generateInappropriateResponse(inappropriateKeywords = []) {
    return randomChoice(inappropriateResponses);
  }

  /**
   * 優しい応答を生成
   * @returns {string} 応答テキスト
   */
  generateGentleResponse() {
    return randomChoice(gentleResponses);
  }

  /**
   * ユーザーのメッセージに応じた応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {Object} 応答情報 { response: string, isInappropriate: boolean }
   */
  generateResponse(userMessage = '', conversationHistory = []) {
    // 検証
    const validation = this.validator.validateMessage(userMessage);
    
    // 不適切な発言の場合
    if (this.validator.isInappropriate(userMessage)) {
      const keywords = this.validator.getInappropriateKeywords(userMessage);
      return {
        response: this.generateInappropriateResponse(keywords),
        isInappropriate: true,
        warnings: validation.warnings,
      };
    }

    // 会話のステージを取得（会話履歴と現在のメッセージを渡す）
    const stage = this.flowManager.getCurrentStage(conversationHistory, userMessage);
    
    // 1通目：最初の質問への応答
    if (stage === 'first') {
      const firstResponse = this.flowManager.generateFirstResponse(userMessage);
      return {
        response: firstResponse,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // 2通目：曖昧な質問の場合
    if (stage === 'vague_second') {
      const secondResponse = this.flowManager.generateSecondVagueResponse(userMessage);
      return {
        response: secondResponse,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // 3通目：曖昧な質問の場合の性格診断
    if (stage === 'vague_third') {
      const thirdResponse = this.flowManager.generateThirdVagueResponse(userMessage, conversationHistory);
      return {
        response: thirdResponse,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // 2〜3通目：具体的な質問を返す
    if (stage === 'questioning') {
      const questionType = this.questioningSystem.determineQuestionType(userMessage);
      const specificQuestion = this.questioningSystem.generateSpecificQuestions(
        questionType,
        userMessage,
        conversationHistory
      );
      
      const questionResponse = this.flowManager.generateQuestionResponse(
        userMessage,
        specificQuestion
      );
      
      return {
        response: questionResponse,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // 4通目以降：人間性の分析
    if (stage === 'analysis') {
      const personalityAnalysis = this.flowManager.generatePersonalityAnalysis(conversationHistory);
      
      // 守護神呼び出しの提案をチェック
      const guardianProposal = this.flowManager.proposeGuardianSummoning();
      if (guardianProposal) {
        return {
          response: `${personalityAnalysis}\n\n${guardianProposal}`,
          isInappropriate: false,
          warnings: validation.warnings,
        };
      }
      
      return {
        response: personalityAnalysis,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // 守護神呼び出しの提案後
    if (stage === 'guardian_proposal') {
      // ユーザーが「お願いします」「OK」などと返答した場合の処理は後で実装
      // 今は通常の応答を返す
      const questionType = this.questioningSystem.determineQuestionType(userMessage);
      const specificQuestion = this.questioningSystem.generateSpecificQuestions(
        questionType,
        userMessage,
        conversationHistory
      );
      
      return {
        response: specificQuestion,
        isInappropriate: false,
        warnings: validation.warnings,
      };
    }

    // フォールバック
    return {
      response: 'お話をうかがわせていただき、ありがとうございます。',
      isInappropriate: false,
      warnings: validation.warnings,
    };
  }

  /**
   * 優しい応答を追加で生成
   * @param {string} baseResponse - ベースとなる応答
   * @returns {string} 優しい応答を含むテキスト
   */
  addGentleNote(baseResponse) {
    const gentleNote = this.generateGentleResponse();
    return `${baseResponse}\n\n${gentleNote}`;
  }
}

/**
 * 応答モジュールのインスタンスを作成
 * @returns {ResponseModule} モジュールインスタンス
 */
export function createResponseModule() {
  return new ResponseModule();
}

