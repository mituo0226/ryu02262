/**
 * キャラクターローダー
 * Cloudflare Pages Functions用のキャラクターシステム統合
 */

// 有効なキャラクターIDのリスト
const validCharacterIds = ['kaede', 'yukino', 'sora', 'kaon'];

/**
 * 有効なキャラクターIDかチェック
 * @param {string} characterId - キャラクターID
 * @returns {boolean} 有効かどうか
 */
function isValidCharacter(characterId) {
  return validCharacterIds.includes(characterId);
}

/**
 * すべてのキャラクターIDを取得
 * @returns {Array<string>} キャラクターIDの配列
 */
function getAllCharacterIds() {
  return [...validCharacterIds];
}

module.exports = {
  isValidCharacter,
  getAllCharacterIds,
};

