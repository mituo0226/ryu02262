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
 * 各キャラクターの専門性と役割を定義（API側で一元管理）
 * 
 * 【拡張性】
 * - 新しいキャラクターを追加する際は、このオブジェクトに追加するだけ
 * - ネガティブプロンプトは使用しないため、キャラクターが50人に増えてもプロンプトサイズは一定
 * 
 * @property {string[]} features - 利用可能な機能リスト
 * @property {string} expertise - 専門分野（一言で表現）
 * @property {string} approach - 鑑定アプローチ
 */
const CHARACTER_DEFINITIONS = {
  yukino: {
    features: ['tarot', 'consultation'],
    expertise: '心理学とタロット占い',
    approach: 'タロットカードと心理学を融合させた鑑定',
  },
  kaede: {
    features: ['guardian-ritual'],
    expertise: '霊能鑑定と守護神交信',
    approach: '守護神を通じた霊視と魂レベルの導き',
  },
  sora: {
    features: [],
    expertise: 'ダイナミック・ソウル・アプローチ',
    approach: '魂レベルでの共鳴と深い寄り添い',
  },
  kaon: {
    features: [],
    expertise: '占星術と数秘術',
    approach: '天体と数秘から読み解く心理的寄り添い',
  },
};

/**
 * キャラクターの利用可能な機能を取得
 * @param {string} characterId - キャラクターID
 * @returns {string[]} 利用可能な機能のリスト
 */
export function getCharacterFeatures(characterId) {
  const definition = CHARACTER_DEFINITIONS[characterId];
  return definition ? definition.features : [];
}

/**
 * キャラクターの専門性を取得
 * @param {string} characterId - キャラクターID
 * @returns {Object} キャラクターの定義
 */
export function getCharacterDefinition(characterId) {
  return CHARACTER_DEFINITIONS[characterId] || {
    features: [],
    expertise: '総合鑑定',
    approach: '相談者に寄り添った鑑定',
  };
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
 * キャラクターの専門性と役割をシステムプロンプト用のテキストに変換（ポジティブアプローチ）
 * @param {string} characterId - キャラクターID
 * @param {string[]} availableFeatures - 利用可能な機能のリスト
 * @returns {string} キャラクター定義のテキスト
 */
export function generateCapabilityConstraints(characterId, availableFeatures = []) {
  const definition = getCharacterDefinition(characterId);
  
  let constraintText = `
========================================
【あなたの役割と専門性】
========================================

あなたの専門分野：${definition.expertise}
あなたの鑑定アプローチ：${definition.approach}

`;

  if (availableFeatures.length > 0) {
    constraintText += `【提供する機能】
${availableFeatures.map(feature => {
  const name = getFeatureName(feature);
  const desc = getFeatureDescription(feature);
  return `✅ ${name}：${desc}`;
}).join('\n')}

`;
  }

  constraintText += `【重要な原則】
✅ あなたの専門性を最大限に活かした鑑定を提供してください
✅ あなた自身のキャラクター設定と専門分野に忠実に行動してください
✅ 他の鑑定士の専門分野や手法を使用しないでください

========================================
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
