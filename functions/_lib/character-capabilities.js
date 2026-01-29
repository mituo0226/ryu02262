/**
 * character-capabilities.js
 * 各キャラクターの機能（capabilities）を定義し、システムプロンプトに反映する
 * 
 * 【重要】ポジティブアプローチを採用：
 * - そのキャラクターが持つ機能のみを明示的に伝える
 * - ネガティブプロンプト（他のキャラクターの機能を列挙）は最小限に
 * - これにより、キャラクターが50人に増えてもプロンプトが膨大にならない
 * 
 * 【設計方針】
 * - 機能情報はAPI側で一元管理（config.jsonとは別管理）
 * - 新しいキャラクターを追加する際は、このファイルに機能情報を追加するだけ
 * - 各キャラクターのプロンプト生成関数から機能制約を削除し、ここで一元管理
 */

/**
 * 各キャラクターの利用可能な機能を定義（API側で一元管理）
 * この定義は、システムプロンプトに明示的に含められる
 * 
 * 【拡張性】
 * - 新しいキャラクターを追加する際は、このオブジェクトに追加するだけ
 * - 新しい機能を追加する際は、getFeatureName()とgetFeatureDescription()に追加するだけ
 * - ネガティブプロンプトは使用しないため、キャラクターが50人に増えてもプロンプトサイズは一定
 */
const CHARACTER_FEATURES = {
  yukino: ['tarot', 'consultation'],
  kaede: ['guardian-ritual'],
  sora: [],
  kaon: [],
};

/**
 * キャラクターの利用可能な機能を取得
 * @param {string} characterId - キャラクターID
 * @returns {string[]} 利用可能な機能のリスト
 */
export function getCharacterFeatures(characterId) {
  return CHARACTER_FEATURES[characterId] || [];
}

/**
 * 機能名を日本語に変換
 * @param {string} feature - 機能ID
 * @returns {string} 機能名
 */
function getFeatureName(feature) {
  const featureNames = {
    'tarot': 'タロット占い',
    'guardian-ritual': '守護神の儀式',
    'consultation': '個別相談モード',
  };
  return featureNames[feature] || feature;
}

/**
 * 機能の説明を生成
 * @param {string} feature - 機能ID
 * @returns {string} 機能の説明
 */
function getFeatureDescription(feature) {
  const descriptions = {
    'tarot': 'タロットカードを引いて占いを行うことができます。',
    'guardian-ritual': '守護神の儀式を実行することができます。',
    'consultation': '個別相談モードを使用することができます。',
  };
  return descriptions[feature] || '';
}

/**
 * キャラクターの機能制約をシステムプロンプト用のテキストに変換（ポジティブアプローチ）
 * @param {string} characterId - キャラクターID
 * @param {string[]} availableFeatures - 利用可能な機能のリスト（config.jsonから取得）
 * @returns {string} 機能制約のテキスト
 */
export function generateCapabilityConstraints(characterId, availableFeatures = []) {
  // 利用可能な機能のみを明示（ポジティブアプローチ）
  // 注意：この部分は各キャラクターのプロンプトに比べて背景的な指示のため、敬語・中立的な表現を使用
  let constraintText = `
========================================
【利用可能な機能】
========================================

`;

  if (availableFeatures.length > 0) {
    constraintText += `${availableFeatures.map(feature => {
  const name = getFeatureName(feature);
  const desc = getFeatureDescription(feature);
  return `✅ ${name}：${desc}`;
}).join('\n')}

`;
  } else {
    constraintText += `✅ 通常の相談対応
`;
  }

  constraintText += `========================================
`;

  return constraintText;
}

/**
 * キャラクターが特定の機能を持っているかチェック
 * @param {string[]} availableFeatures - 利用可能な機能のリスト
 * @param {string} feature - 機能ID
 * @returns {boolean} 機能を持っているか
 */
export function hasCapability(availableFeatures, feature) {
  return Array.isArray(availableFeatures) && availableFeatures.includes(feature);
}
