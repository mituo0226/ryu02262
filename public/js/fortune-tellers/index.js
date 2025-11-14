/**
 * 鑑定士システム - メインエクスポート
 * 簡単な利用インターフェースを提供
 */
import { ConfigManager } from './config-manager.js';
import { createKaede } from './characters/kaede/index.js';
import { createYukino } from './characters/yukino/index.js';
import { createSora } from './characters/sora/index.js';
import { createKaon } from './characters/kaon/index.js';

// シングルトンインスタンス
let configManager = null;

/**
 * 設定マネージャーを初期化
 * @returns {ConfigManager} 設定マネージャーインスタンス
 */
function initializeConfigManager() {
  if (!configManager) {
    configManager = new ConfigManager();
    
    // すべてのキャラクターを登録
    configManager.registerCharacter(createKaede());
    configManager.registerCharacter(createYukino());
    configManager.registerCharacter(createSora());
    configManager.registerCharacter(createKaon());
  }
  return configManager;
}

/**
 * 設定マネージャーを取得
 * @returns {ConfigManager} 設定マネージャーインスタンス
 */
export function getConfigManager() {
  return initializeConfigManager();
}

/**
 * キャラクターを取得
 * @param {string} id - キャラクターID
 * @returns {CharacterBase|null} キャラクターインスタンス
 */
export function getCharacter(id) {
  const manager = getConfigManager();
  return manager.getCharacter(id);
}

/**
 * すべてのキャラクターを取得
 * @returns {Array<CharacterBase>} キャラクターの配列
 */
export function getAllCharacters() {
  const manager = getConfigManager();
  return manager.getAllCharacters();
}

/**
 * 現在のキャラクターを設定
 * @param {string} id - キャラクターID
 */
export function setCurrentCharacter(id) {
  const manager = getConfigManager();
  manager.setCurrentCharacter(id);
}

/**
 * 現在のキャラクターを取得
 * @returns {CharacterBase|null} 現在のキャラクターインスタンス
 */
export function getCurrentCharacter() {
  const manager = getConfigManager();
  return manager.getCurrentCharacter();
}

// デフォルトエクスポート
export default {
  getConfigManager,
  getCharacter,
  getAllCharacters,
  setCurrentCharacter,
  getCurrentCharacter,
};

