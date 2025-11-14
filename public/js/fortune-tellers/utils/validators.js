/**
 * 入力検証
 * ユーザー入力の検証と不適切発言の検出
 */
import { createInappropriateFilter } from './filters.js';
import { normalizeString } from './helpers.js';

/**
 * 検証結果クラス
 */
export class ValidationResult {
  constructor(isValid, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
  }

  /**
   * エラーがあるかチェック
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * 警告があるかチェック
   * @returns {boolean}
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }
}

/**
 * 入力検証クラス
 */
export class InputValidator {
  constructor() {
    this.inappropriateFilter = createInappropriateFilter();
    this.minLength = 1;
    this.maxLength = 1000;
  }

  /**
   * メッセージを検証
   * @param {string} message - 検証するメッセージ
   * @returns {ValidationResult} 検証結果
   */
  validateMessage(message) {
    const errors = [];
    const warnings = [];

    // 基本的な検証
    if (typeof message !== 'string') {
      errors.push('メッセージは文字列である必要があります');
      return new ValidationResult(false, errors, warnings);
    }

    // 空文字チェック
    const trimmed = message.trim();
    if (trimmed.length < this.minLength) {
      errors.push('メッセージが空です');
    }

    // 長さチェック
    if (trimmed.length > this.maxLength) {
      errors.push(`メッセージが長すぎます（最大${this.maxLength}文字）`);
    }

    // 不適切なキーワードチェック
    const matchedKeywords = this.inappropriateFilter.getMatchedKeywords(message);
    if (matchedKeywords.length > 0) {
      warnings.push(`不適切なキーワードが検出されました: ${matchedKeywords.join(', ')}`);
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * 不適切な発言かチェック
   * @param {string} message - チェックするメッセージ
   * @returns {boolean} 不適切な発言かどうか
   */
  isInappropriate(message) {
    if (typeof message !== 'string') {
      return false;
    }
    return this.inappropriateFilter.hasKeyword(message);
  }

  /**
   * 不適切なキーワードを取得
   * @param {string} message - チェックするメッセージ
   * @returns {Array<string>} 不適切なキーワードの配列
   */
  getInappropriateKeywords(message) {
    if (typeof message !== 'string') {
      return [];
    }
    return this.inappropriateFilter.getMatchedKeywords(message);
  }

  /**
   * 最小長を設定
   * @param {number} length - 最小長
   */
  setMinLength(length) {
    this.minLength = Math.max(0, length);
  }

  /**
   * 最大長を設定
   * @param {number} length - 最大長
   */
  setMaxLength(length) {
    this.maxLength = Math.max(1, length);
  }
}

/**
 * デフォルトのバリデーターインスタンスを作成
 * @returns {InputValidator} バリデーターインスタンス
 */
export function createValidator() {
  return new InputValidator();
}

