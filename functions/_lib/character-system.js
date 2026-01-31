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
// 注意：このガイドラインは【キャラクター個性を尊重するため敬語を使わない】
// 各キャラクターの話し方に合わせてアレンジされます
const COMMON_SAFETY_GUIDELINES = `
【重要：深刻な悩みへの対応ガイドライン】
相談者が深刻な悩みを打ち明けた場合、あなたのキャラクター性を絶対に守りつつ対応してください：

【楓（霊能者）の場合】
1. **霊視による洞察**
   「あなたの近くに、あなたを心から慕っている人がたくさんいることが視えます」
   「守護神様も、あなたを深く心配しておられます」

2. **心を開くことを促す**
   「自分の心を正直に周りの人に打ち明けてみましょう」
   
3. **スピリチュアルな実践**
   お墓参り、神社参拝、朝晩の祈り、玄関の掃除など

【雪乃（タロット占い師）の場合】
1. **占い師を超えて一人の女性として心配する**
   「タロットを見る前に...一人の人間として、心配です」
   
2. **一緒に考える姿勢**
   「一緒にどうすれば良いか、考えさせてください」
   「私も一緒に悩みます」

3. **信頼できる人に話すことを優しく促す**
   「周りに信頼できる人がいたら、話してみてくださいね」

【空・花音の場合】
各キャラクターの個性に応じた共感と寄り添いを示す

【絶対禁止事項】
❌ 電話番号（いのちの電話など）を案内する
❌ 専門機関・病院・カウンセラーを紹介する
❌ 「〜に相談してください」という現実的なアドバイス
❌ 説教調や上から目線の指導
❌ キャラクター性を無視した一般的なAI対応

【基本方針】
- あなたのキャラクター個性を絶対に守る
- 霊能者・占い師としての役割を貫く
- 機械的な定型文は絶対に避ける
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
 * @param {boolean} options.isJustRegistered - 初回登録直後か（5分以内）
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
  // 三崎花音用の特別なパラメータ処理
  const isKaon = characterId === 'kaon';
  
  const characterPrompt = generator({
    userNickname: options.userNickname,
    hasPreviousConversation: options.hasPreviousConversation,
    nicknameContext,
    conversationContext,
    guestUserContext,
    guardian: options.guardian || null,
    isRitualStart: options.isRitualStart || false,
    isJustRegistered: options.isJustRegistered || false,
    userMessageCount: options.userMessageCount || 0,
    userGender: options.userGender || null,
    ...(isKaon ? { birthDate: options.userBirthDate || null } : { userBirthDate: options.userBirthDate || null }),
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

  // lastConversationSummaryをログ用に文字列化（オブジェクト形式にも対応）
  let lastConversationSummaryPreview = null;
  if (options.lastConversationSummary) {
    if (typeof options.lastConversationSummary === 'object') {
      // オブジェクト形式の場合
      lastConversationSummaryPreview = `${options.lastConversationSummary.date || ''}: ${options.lastConversationSummary.topics || ''}`.substring(0, 100);
    } else {
      // 文字列形式の場合（後方互換性）
      lastConversationSummaryPreview = options.lastConversationSummary.substring(0, 100);
    }
  }

  console.log('[character-system] システムプロンプト生成完了:', {
    characterId,
    userNickname: options.userNickname,
    hasPreviousConversation: options.hasPreviousConversation,
    guardian: options.guardian,
    isRitualStart: options.isRitualStart,
    userMessageCount: options.userMessageCount,
    visitPattern: options.visitPattern,
    lastConversationSummary: lastConversationSummaryPreview,
    promptLength: prompt.length,
    characterPromptLength: characterPrompt.length,
    promptPreview: characterPrompt.substring(0, 300) + '...',
  });

  return prompt;
}
