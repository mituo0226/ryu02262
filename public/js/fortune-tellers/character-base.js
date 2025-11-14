/**
 * 基本キャラクタークラス
 * すべての鑑定士が継承する共通機能を提供
 */
import { createValidator } from './utils/validators.js';

export class CharacterBase {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.nameKana = config.nameKana;
    this.birthday = config.birthday;
    this.zodiac = config.zodiac;
    this.birthplace = config.birthplace;
    this.profile = config.profile || '';
    this.message = config.message || '';
    this.imagePath = config.imagePath || '';
    
    // バリデーターの初期化
    this.validator = createValidator();
    
    // 専門モジュール（サブクラスで設定）
    this.modules = {};
  }

  /**
   * キャラクター情報を取得
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      nameKana: this.nameKana,
      birthday: this.birthday,
      zodiac: this.zodiac,
      birthplace: this.birthplace,
      profile: this.profile,
      message: this.message,
      imagePath: this.imagePath,
    };
  }

  /**
   * キャラクター名を取得
   */
  getName() {
    return this.name;
  }

  /**
   * キャラクターIDを取得
   */
  getId() {
    return this.id;
  }

  /**
   * プロフィールを取得
   */
  getProfile() {
    return this.profile;
  }

  /**
   * メッセージを取得
   */
  getMessage() {
    return this.message;
  }

  /**
   * モジュールを登録
   * @param {string} name - モジュール名
   * @param {Object} module - モジュールインスタンス
   */
  registerModule(name, module) {
    this.modules[name] = module;
  }

  /**
   * モジュールを取得
   * @param {string} name - モジュール名
   * @returns {Object|null} モジュールインスタンス
   */
  getModule(name) {
    return this.modules[name] || null;
  }

  /**
   * 不適切な発言を検出
   * @param {string} message - ユーザーのメッセージ
   * @returns {Object} 検出結果 { isInappropriate: boolean, keywords: Array<string> }
   */
  detectInappropriate(message) {
    const isInappropriate = this.validator.isInappropriate(message);
    const keywords = this.validator.getInappropriateKeywords(message);
    
    return {
      isInappropriate,
      keywords,
    };
  }

  /**
   * 不適切なユーザーへの戒め応答を生成
   * サブクラスでオーバーライドする
   * @param {Array<string>} keywords - 検出された不適切なキーワード
   * @returns {string} 戒めの応答
   */
  generateWarningResponse(keywords = []) {
    return 'そのようなご相談にはお答えできません。';
  }

  /**
   * 通常の応答を生成
   * サブクラスでオーバーライドする
   * @param {string} message - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(message = '') {
    return 'ご相談ありがとうございます。';
  }

  /**
   * ユーザーメッセージに応じた適切な応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {Object} 応答情報 { response: string, isInappropriate: boolean, warnings: Array<string> }
   */
  respondToUser(userMessage = '') {
    // 入力検証
    const validation = this.validator.validateMessage(userMessage);
    
    // 不適切な発言の検出
    const detection = this.detectInappropriate(userMessage);
    
    if (detection.isInappropriate) {
      // 不適切な発言への戒め応答
      const warningResponse = this.generateWarningResponse(detection.keywords);
      return {
        response: warningResponse,
        isInappropriate: true,
        warnings: validation.warnings,
        detectedKeywords: detection.keywords,
      };
    }
    
    // 通常の応答
    const normalResponse = this.generateNormalResponse(userMessage);
    return {
      response: normalResponse,
      isInappropriate: false,
      warnings: validation.warnings,
      detectedKeywords: [],
    };
  }
}

