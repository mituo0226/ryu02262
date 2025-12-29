/**
 * character-system.js
 * 鑑定士システムのシンプル実装
 */

import { generateKaedePrompt } from './characters/kaede.js';
import { generateYukinoPrompt } from './characters/yukino.js';
import { generateSoraPrompt } from './characters/sora.js';
import { generateKaonPrompt } from './characters/kaon.js';

// ===== 不適切なキーワード =====
const inappropriateKeywords = [
  '宝くじ', '当選', '当選番号', '当選確率',
  'ギャンブル', 'パチンコ', 'スロット', '競馬', '競艇',
  '破壊', '傷害', '殺害', '自殺',
];

/**
 * 不適切な発言かチェック
 */
export function isInappropriate(message) {
  const lowerMessage = message.toLowerCase();
  return inappropriateKeywords.some((keyword) =>
    lowerMessage.includes(keyword.toLowerCase())
  );
}

/**
 * キャラクター名を取得
 */
export function getCharacterName(characterId) {
  const names = {
    kaede: '楓',
    yukino: '笹岡雪乃',
    sora: '空',
    kaon: '三崎花音',
  };
  return names[characterId] || characterId;
}

// ===== システムプロンプト生成 =====

/**
 * システムプロンプトを生成
 * @param {string} characterId - キャラクターID (kaede, yukino, sora, kaon)
 * @param {Object} options - オプション
 * @param {string} options.userNickname - ユーザーのニックネーム
 * @param {boolean} options.hasPreviousConversation - 過去の会話履歴があるか
 * @param {number} options.conversationHistoryLength - 会話履歴の長さ
 * @param {number} options.userMessageCount - ユーザーメッセージ数
 * @param {boolean} options.isRitualStart - 守護神の儀式開始メッセージか
 * @param {string|null} options.guardian - 守護神（決定済みの場合）
 * @param {boolean} options.encourageRegistration - 登録を促すか
 * @returns {string} システムプロンプト
 */
export function generateSystemPrompt(characterId, options = {}) {
  // ===== 1. 基本情報の準備 =====

  // ニックネームの指示
  const nicknameContext = options.userNickname
    ? `【重要】相談者の名前は「${options.userNickname}」です。会話では必ず「${options.userNickname}さん」と呼んでください。`
    : '';

  // 会話履歴の有無
  const conversationContext = options.hasPreviousConversation
    ? 'この相談者とは以前にも会話をしたことがあります。前回の内容を覚えているかのように、自然に会話を続けてください。'
    : '';

  // ゲストユーザー向けの指示
  const guestUserContext = !options.userNickname
    ? '【ゲストユーザーへの対応】\n- ゲストユーザーはまだ正式に登録していないため、親しみやすく接してください\n- 各鑑定士の性格設定（話し方、口調、性格）を守って応答してください'
    : '';

  const guardianRitualCompleted =
    options.guardian &&
    typeof options.guardian === 'string' &&
    options.guardian.trim() !== '';

  console.log('[character-system] 守護神完了チェック:', {
    guardian: options.guardian,
    guardianRitualCompleted,
  });

  const promptGenerators = {
    kaede: generateKaedePrompt,
    yukino: generateYukinoPrompt,
    sora: generateSoraPrompt,
    kaon: generateKaonPrompt,
  };

  const generator = promptGenerators[characterId] || promptGenerators.kaede;
  const prompt = generator({
    ...options,
    nicknameContext,
    conversationContext,
    guestUserContext,
  });

  console.log('[character-system] システムプロンプト生成完了:', {
    characterId,
    userNickname: options.userNickname,
    guardian: options.guardian,
    guardianRitualCompleted,
    isRitualStart: options.isRitualStart,
    userMessageCount: options.userMessageCount,
  });

  return prompt;
}
