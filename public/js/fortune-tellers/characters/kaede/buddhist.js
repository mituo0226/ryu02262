/**
 * 日蓮宗の影響を受けた発言機能
 * 楓の仏教的な側面を表現するモジュール
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 日蓮宗の教えに基づく発言テンプレート
 */
const buddhistPhrases = [
  '南無妙法蓮華経と唱えることで、心が清められていきます',
  '法華経の教えによれば、すべての人は仏性を持っています',
  '日々の修行と信心が、運命を好転させる力となります',
  'お題目を唱えることで、困難な状況も乗り越えられます',
  '法華経は、すべての人を救うための教えです',
  '信心深く生きることで、真の幸福が得られます',
];

/**
 * 日蓮宗の教えに関する引用
 */
const buddhistWisdom = [
  '「一念三千」という言葉があります。一瞬の心の状態が、すべての世界を表しているのです',
  '「即身成仏」の教えのように、今この瞬間から仏になることができます',
  '「諸法実相」とは、すべてのものの真実の姿を見ることです',
  '「一乗妙法」は、すべての人を救う唯一の教えです',
];

/**
 * 日蓮宗の影響を受けた発言を生成
 * @param {Object} context - コンテキスト情報
 * @returns {string} 発言テキスト
 */
export function generateBuddhistResponse(context = {}) {
  const phrases = [...buddhistPhrases];
  const wisdom = [...buddhistWisdom];
  
  // コンテキストに応じて選択
  const useWisdom = Math.random() > 0.5;
  
  if (useWisdom && wisdom.length > 0) {
    return randomChoice(wisdom);
  }
  
  return randomChoice(phrases);
}

/**
 * 日蓮宗の教えを組み合わせた応答を生成
 * @param {string} userMessage - ユーザーのメッセージ
 * @returns {string} 応答テキスト
 */
export function createBuddhistAdvice(userMessage = '') {
  const baseResponse = generateBuddhistResponse();
  
  // ユーザーのメッセージに応じてカスタマイズ
  if (userMessage.includes('悩み') || userMessage.includes('困')) {
    return `${baseResponse}。悩みがある時こそ、お題目を唱えて心を落ち着かせることが大切です。`;
  }
  
  if (userMessage.includes('運命') || userMessage.includes('未来')) {
    return `${baseResponse}。運命は変えられるものです。信心と行動が、未来を切り開きます。`;
  }
  
  return baseResponse;
}

/**
 * 日蓮宗の教えモジュール
 */
export class BuddhistModule {
  /**
   * 応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateResponse(userMessage = '') {
    return createBuddhistAdvice(userMessage);
  }

  /**
   * ランダムな教えを取得
   * @returns {string} 教えのテキスト
   */
  getRandomWisdom() {
    return randomChoice(buddhistWisdom);
  }

  /**
   * ランダムなフレーズを取得
   * @returns {string} フレーズのテキスト
   */
  getRandomPhrase() {
    return randomChoice(buddhistPhrases);
  }
}

/**
 * 日蓮宗モジュールのインスタンスを作成
 * @returns {BuddhistModule} モジュールインスタンス
 */
export function createBuddhistModule() {
  return new BuddhistModule();
}

