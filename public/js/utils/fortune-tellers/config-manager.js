/**
 * 設定管理クラス
 * キャラクターの登録、取得、切り替えを管理
 */
import { CharacterBase } from './character-base.js';

export class ConfigManager {
  constructor() {
    this.characters = new Map();
    this.currentCharacter = null;
  }

  /**
   * キャラクターを登録
   * @param {CharacterBase} character - 登録するキャラクターインスタンス
   */
  registerCharacter(character) {
    if (!(character instanceof CharacterBase)) {
      throw new Error('Character must be an instance of CharacterBase');
    }
    this.characters.set(character.getId(), character);
  }

  /**
   * IDでキャラクターを取得
   * @param {string} id - キャラクターID
   * @returns {CharacterBase|null} キャラクターインスタンス
   */
  getCharacter(id) {
    return this.characters.get(id) || null;
  }

  /**
   * すべてのキャラクターを取得
   * @returns {Array<CharacterBase>} キャラクターの配列
   */
  getAllCharacters() {
    return Array.from(this.characters.values());
  }

  /**
   * 現在のキャラクターを設定
   * @param {string} id - キャラクターID
   */
  setCurrentCharacter(id) {
    const character = this.getCharacter(id);
    if (!character) {
      throw new Error(`Character with id "${id}" not found`);
    }
    this.currentCharacter = character;
  }

  /**
   * 現在のキャラクターを取得
   * @returns {CharacterBase|null} 現在のキャラクターインスタンス
   */
  getCurrentCharacter() {
    return this.currentCharacter;
  }

  /**
   * キャラクターが登録されているか確認
   * @param {string} id - キャラクターID
   * @returns {boolean}
   */
  hasCharacter(id) {
    return this.characters.has(id);
  }
}

