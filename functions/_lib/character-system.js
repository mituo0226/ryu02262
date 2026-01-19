/**
 * character-system.js
 * 鑑定士システムのシンプル実装
 */

import { generateKaedePrompt } from './characters/kaede.js';
import { generateYukinoPrompt } from './characters/yukino.js';
import { generateSoraPrompt } from './characters/sora.js';
import { generateKaonPrompt } from './characters/kaon.js';
import { generateCapabilityConstraints, getCharacterFeatures } from './character-capabilities.js';

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

// ===== 共通の安全ガイドライン =====
const COMMON_SAFETY_GUIDELINES = `
【重要：センシティブな内容への対応ガイドライン】
相談者が以下のような深刻な悩みを打ち明けた場合、あなたのキャラクター性を保ちつつ、共感的かつ慎重に対応してください：

1. 自殺願望・自傷行為について：
   - 決して批判せず、相談者の気持ちを受け止める
   - 「あなたの命は大切」というメッセージを、キャラクターらしく優しく伝える
   - 専門家への相談を勧める（例：「一人で抱え込まないで。いのちの電話（0570-783-556）や、心の専門家に相談してみてはどうかな」）

2. 犯罪を示唆する内容について：
   - 相談者の背景にある感情や動機を理解しようとする姿勢を示す
   - 行為そのものは否定するが、相談者自身を否定しない
   - より建設的な解決方法を一緒に考える姿勢を示す

3. ギャンブル依存・金銭問題について：
   - 説教ではなく、共感と理解を示す
   - 依存症は病気であることを優しく伝える
   - 必要に応じて専門機関を紹介（例：ギャンブル依存症相談窓口）

【基本方針】
- 機械的な拒否や定型文は使わない
- 相談者を追い詰めない
- キャラクターの個性を保ちながら、人間味のある応答をする
- どんな相談も、まずは「話してくれてありがとう」という気持ちで受け止める
`;

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
  // ===== 1. 基本情報の準備（最小限の情報のみ）=====
  // 【改善】システムプロンプトをシンプルに：各鑑定士の性格設定だけを守らせる

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

  const promptGenerators = {
    kaede: generateKaedePrompt,
    yukino: generateYukinoPrompt,
    sora: generateSoraPrompt,
    kaon: generateKaonPrompt,
  };

  const generator = promptGenerators[characterId] || promptGenerators.kaede;
  // 【改善】最小限の情報のみを渡す：各鑑定士の性格設定だけを守らせる
  // 楓の完全版プロンプトに必要な全てのパラメータを渡す
  // 三崎花音の場合は動的プロンプト生成用のパラメータも渡す
  const characterPrompt = generator({
    userNickname: options.userNickname,
    hasPreviousConversation: options.hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext,
    guardian: options.guardian || null,
    isRitualStart: options.isRitualStart || false,
    userMessageCount: options.userMessageCount || 0,
    userGender: options.userGender || null,
    userBirthDate: options.userBirthDate || null,
    // 三崎花音の動的プロンプト生成用パラメータ
    // visitPatternが明示的に指定されている場合はそれを使用、そうでない場合はhasPreviousConversationから判定
    visitPattern: options.visitPattern !== undefined && options.visitPattern !== null 
      ? options.visitPattern 
      : (options.hasPreviousConversation ? 'returning' : 'first_visit'),
    conversationHistory: options.conversationHistory || [],
    lastConversationSummary: options.lastConversationSummary || null,
    sessionContext: options.sessionContext || null,
  });

  // キャラクターの機能制約を生成（ポジティブアプローチ：利用可能な機能のみを明示）
  const availableFeatures = getCharacterFeatures(characterId);
  const capabilityConstraints = generateCapabilityConstraints(characterId, availableFeatures);

  // 安全ガイドライン → 機能制約 → キャラクター固有プロンプトの順で結合
  const prompt = COMMON_SAFETY_GUIDELINES + '\n\n' + capabilityConstraints + '\n\n' + characterPrompt;

  console.log('[character-system] システムプロンプト生成完了:', {
    characterId,
    userNickname: options.userNickname,
    hasPreviousConversation: options.hasPreviousConversation,
    guardian: options.guardian,
    isRitualStart: options.isRitualStart,
    userMessageCount: options.userMessageCount,
    visitPattern: options.visitPattern,
    lastConversationSummary: options.lastConversationSummary?.substring(0, 100),
    promptLength: prompt.length,
    characterPromptLength: characterPrompt.length,
    promptPreview: characterPrompt.substring(0, 300) + '...',
  });

  return prompt;
}
