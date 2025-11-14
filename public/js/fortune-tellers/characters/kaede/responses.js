/**
 * 応答テンプレート
 * 楓の応答パターンと不適切ユーザー対応
 */
import { randomChoice, replaceTemplate } from '../../utils/helpers.js';
import { createValidator } from '../../utils/validators.js';

/**
 * 通常の応答テンプレート
 */
const normalResponses = [
  'お話を聞かせていただき、ありがとうございます。{message}について、一緒に考えていきましょう。',
  'ご相談の内容、よく理解いたしました。{message}について、穏やかに見守らせていただきます。',
  'ありがとうございます。{message}について、お役に立てるよう、精一杯お手伝いさせていただきます。',
  'ご相談いただき、感謝いたします。{message}について、心を込めてお答えします。',
];

/**
 * 不適切なユーザーへの応答テンプレート
 */
const inappropriateResponses = [
  '申し訳ございませんが、そのようなご相談にはお答えできません。穏やかな日常を大切にすることが、何よりの幸福の道だと考えております。',
  'そのような内容のご相談は、お受けすることができません。悪用される危険をはらむものは、決して扱うことができません。',
  'ごめんなさい。そのようなご相談には対応いたしかねます。一般市民として、正しい道を歩むことが大切だと考えております。',
  '申し訳ございませんが、そのようなご相談はお断りさせていただきます。穏やかな日常を守ることが、私の務めでございます。',
];

/**
 * 優しい応答テンプレート
 */
const gentleResponses = [
  'どうか、無理をなさらないでください。あなたのペースで、ゆっくりと進んでいきましょう。',
  '大丈夫です。一人で抱え込まないでください。一緒に考えていきましょう。',
  'あなたの気持ち、よくわかります。焦らず、一歩ずつ進んでいきましょう。',
  'どうか、自分を責めないでください。あなたは、あなたのままで十分に素晴らしいのです。',
];

/**
 * 応答生成クラス
 */
export class ResponseModule {
  constructor() {
    this.validator = createValidator();
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
   * @returns {Object} 応答情報 { response: string, isInappropriate: boolean }
   */
  generateResponse(userMessage = '') {
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

    // 通常の応答
    return {
      response: this.generateNormalResponse(userMessage),
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

