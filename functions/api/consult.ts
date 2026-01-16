// Cloudflare Pages Functions の型定義
import { generateSystemPrompt, getCharacterName } from '../_lib/character-system.js';
import { isValidCharacter } from '../_lib/character-loader.js';

// ===== 定数 =====
const MAX_DEEPSEEK_RETRIES = 3;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';
const MAX_NORMAL_MESSAGES = 10; // 通常保存する最新メッセージ数
const MAX_SUMMARY_COUNT = 10; // 保持する要約の最大数
const MAX_TOTAL_MESSAGES = 100; // 全体の最大メッセージ数（通常 + 要約）

// ===== 型定義 =====
type ConversationRole = 'user' | 'assistant';

interface ClientHistoryEntry {
  role: ConversationRole;
  content: string;
  isGuestMessage?: boolean;
}

interface GuestMetadata {
  messageCount?: number;
}

interface RequestBody {
  message: string;
  character?: string;
  clientHistory?: ClientHistoryEntry[];
  migrateHistory?: boolean;
  guestMetadata?: GuestMetadata;
  ritualStart?: boolean; // 守護神の儀式開始通知フラグ
  userId?: number; // ユーザー識別用（優先的に使用）
  nickname?: string; // ユーザー識別用（後方互換性のため）
  birthYear?: number; // ユーザー識別用（後方互換性のため）
  birthMonth?: number; // ユーザー識別用（後方互換性のため）
  birthDay?: number; // ユーザー識別用（後方互換性のため）
}

interface ResponseBody {
  message: string;
  character: string;
  characterName: string;
  isInappropriate: boolean;
  detectedKeywords: string[];
  error?: string;
  showTarotCard?: boolean;
  provider?: 'deepseek' | 'openai';
  clearChat?: boolean; // チャットクリア指示フラグ（APIからの指示）
  redirect?: boolean; // 汎用的なリダイレクト指示フラグ
  redirectUrl?: string; // リダイレクト先URL（汎用的）
}

interface UserRecord {
  id: number;
  nickname: string;
  guardian: string | null;
}

interface ConversationRow {
  role: ConversationRole;
  message?: string; // 後方互換性のため残す（実際はcontentを使用）
  content?: string; // 実際のカラム名
  is_guest_message?: number;
}

interface LLMResponseResult {
  success: boolean;
  message?: string;
  provider?: 'deepseek' | 'openai';
  rawResponse?: unknown;
  error?: string;
  status?: number;
}

interface LLMRequestParams {
  systemPrompt: string;
  conversationHistory: ClientHistoryEntry[];
  userMessage: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  deepseekApiKey: string;
  fallbackApiKey?: string;
  fallbackModel?: string;
}

// ===== ユーティリティ関数 =====

/**
 * クライアント履歴をサニタイズ（不正な値を除去）
 */
function sanitizeClientHistory(entries?: ClientHistoryEntry[]): ClientHistoryEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => {
      if (!entry || (entry.role !== 'user' && entry.role !== 'assistant')) {
        return null;
      }
      if (typeof entry.content !== 'string' || !entry.content.trim()) {
        return null;
      }
      return { role: entry.role, content: entry.content.trim() };
    })
    .filter((entry): entry is ClientHistoryEntry => Boolean(entry))
    .slice(-12); // 直近12件まで保持
}

/**
 * エラーメッセージを抽出
 */
function extractErrorMessage(text: string, fallback: string): string {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) return parsed.error.message as string;
    if (typeof parsed?.message === 'string') return parsed.message;
  } catch {
    // JSON parse エラーは無視
  }
  return text || fallback;
}

/**
 * サービスビジーエラーかどうかを判定
 */
function isServiceBusyError(status: number, errorText: string): boolean {
  const normalized = (errorText || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    normalized.includes('service is too busy') ||
    normalized.includes('please try again later') ||
    normalized.includes('rate limit')
  );
}

/**
 * 待機
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ===== ゲストセッション管理 =====


/**
 * ユーザーの総メッセージ数を取得（全キャラクター合計）
 */
async function getTotalGuestMessageCount(
  db: D1Database,
  guestUserId: number
): Promise<number> {
  // user_idのみで検索
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count 
       FROM conversations c
       WHERE c.user_id = ? AND c.role = 'user'`
    )
    .bind(guestUserId)
    .first<{ count: number }>();
  return result?.count || 0;
}

/**
 * 会話履歴を取得（共通関数）
 */
async function getConversationHistory(
  db: D1Database,
  userId: number,
  characterId: string
): Promise<ClientHistoryEntry[]> {
  const historyResults = await db.prepare<ConversationRow>(
    `SELECT c.role, c.message as content, c.is_guest_message
     FROM conversations c
     WHERE c.user_id = ? AND c.character_id = ?
     ORDER BY COALESCE(c.timestamp, c.created_at) DESC
     LIMIT 20`
  )
    .bind(userId, characterId)
    .all();

  return historyResults.results?.slice().reverse().map((row) => ({
    role: row.role,
    content: row.content || row.message || '',
    isGuestMessage: false,
  })) ?? [];
}

/**
 * 100件制限チェックと古いメッセージの削除（共通関数）
 */
async function checkAndCleanupOldMessages(
  db: D1Database,
  userId: number,
  characterId: string
): Promise<void> {
  // 100件制限チェック
  const messageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ?`
  )
    .bind(userId, characterId)
    .first();

  const messageCount = messageCountResult?.count || 0;

  if (messageCount >= 100) {
    const deleteCount = messageCount - 100 + 1; // 1件追加するので、1件削除
    await db.prepare(
      `DELETE FROM conversations
       WHERE user_id = ? AND character_id = ?
       AND id IN (
         SELECT id FROM conversations
         WHERE user_id = ? AND character_id = ?
         ORDER BY COALESCE(timestamp, created_at) ASC
         LIMIT ?
       )`
    )
      .bind(userId, characterId, userId, characterId, deleteCount)
      .run();
  }
}

/**
 * ユーザーメッセージを保存（2段階保存の第1段階）
 * 会話開始時に即座に保存される
 */
async function saveUserMessage(
  db: D1Database,
  userId: number,
  characterId: string,
  userMessage: string
): Promise<void> {
  // 100件制限チェックと古いメッセージの削除
  try {
    await checkAndCleanupOldMessages(db, userId, characterId);
  } catch (error) {
    console.error('[saveUserMessage] checkAndCleanupOldMessagesエラー:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      characterId,
    });
    // クリーンアップエラーは無視して続行
  }

  // 【新仕様】is_guest_messageは常に0（使用しない）
  const isGuestMessage = 0;

  // ユーザーメッセージを保存
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  try {
    const result = await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage)
      .run();
    console.log('[saveUserMessage] メッセージを保存しました:', {
      userId,
      characterId,
      messageId: result.meta?.last_row_id,
    });
  } catch (error) {
    console.error('[saveUserMessage] timestampカラムでの保存に失敗、created_atで再試行:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      characterId,
    });
    try {
      const result = await db.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
         VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
      )
        .bind(userId, characterId, userMessage, isGuestMessage)
        .run();
      console.log('[saveUserMessage] created_atカラムでメッセージを保存しました:', {
        userId,
        characterId,
        messageId: result.meta?.last_row_id,
      });
    } catch (retryError) {
      console.error('[saveUserMessage] メッセージ保存に完全に失敗:', {
        error: retryError instanceof Error ? retryError.message : String(retryError),
        stack: retryError instanceof Error ? retryError.stack : undefined,
        userId,
        characterId,
      });
      throw retryError; // エラーを再スローして呼び出し元で処理できるようにする
    }
  }
}

/**
 * アシスタントメッセージを保存（2段階保存の第2段階）
 * LLM応答後に保存される
 */
async function saveAssistantMessage(
  db: D1Database,
  userId: number,
  characterId: string,
  assistantMessage: string
): Promise<void> {
  // is_guest_messageは常に0（使用しない）
  const isGuestMessage = 0;

  // アシスタントメッセージの10件制限チェックと古いメッセージの削除
  const assistantMessageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ? AND role = 'assistant'`
  )
    .bind(userId, characterId)
    .first();

  const assistantMessageCount = assistantMessageCountResult?.count || 0;
  const MAX_ASSISTANT_MESSAGES = 10;

  if (assistantMessageCount >= MAX_ASSISTANT_MESSAGES) {
    const deleteCount = assistantMessageCount - MAX_ASSISTANT_MESSAGES + 1; // 1件追加するので、1件削除
    await db.prepare(
      `DELETE FROM conversations
       WHERE user_id = ? AND character_id = ? AND role = 'assistant'
       AND id IN (
         SELECT id FROM conversations
         WHERE user_id = ? AND character_id = ? AND role = 'assistant'
         ORDER BY COALESCE(timestamp, created_at) ASC
         LIMIT ?
       )`
    )
      .bind(userId, characterId, userId, characterId, deleteCount)
      .run();
  }

  // アシスタントメッセージを保存
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  try {
    const result = await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage)
      .run();
    console.log('[saveAssistantMessage] メッセージを保存しました:', {
      userId,
      characterId,
      messageId: result.meta?.last_row_id,
    });
  } catch (error) {
    console.error('[saveAssistantMessage] timestampカラムでの保存に失敗、created_atで再試行:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      characterId,
    });
    try {
      const result = await db.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
         VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
      )
        .bind(userId, characterId, assistantMessage, isGuestMessage)
        .run();
      console.log('[saveAssistantMessage] created_atカラムでメッセージを保存しました:', {
        userId,
        characterId,
        messageId: result.meta?.last_row_id,
      });
    } catch (retryError) {
      console.error('[saveAssistantMessage] メッセージ保存に完全に失敗:', {
        error: retryError instanceof Error ? retryError.message : String(retryError),
        stack: retryError instanceof Error ? retryError.stack : undefined,
        userId,
        characterId,
      });
      throw retryError; // エラーを再スローして呼び出し元で処理できるようにする
    }
  }
}

/**
 * 会話履歴を保存（共通関数）
 * @deprecated 2段階保存（saveUserMessage + saveAssistantMessage）を使用してください
 */
/**
 * 会話履歴を保存（共通関数）
 * @deprecated 2段階保存（saveUserMessage + saveAssistantMessage）を使用してください
 * @deprecated 2段階保存（saveUserMessage + saveAssistantMessage）を使用してください
 */
async function saveConversationHistory(
  db: D1Database,
  userId: number,
  characterId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  // 100件制限チェック
  // 【新仕様】すべてのユーザーを'registered'として扱う
  const messageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ?`
  )
    .bind(userId, characterId)
    .first();

  const messageCount = messageCountResult?.count || 0;

  if (messageCount >= 100) {
    const deleteCount = messageCount - 100 + 2;
    await db.prepare(
      `DELETE FROM conversations
       WHERE user_id = ? AND character_id = ?
       AND id IN (
         SELECT id FROM conversations
         WHERE user_id = ? AND character_id = ?
         ORDER BY COALESCE(timestamp, created_at) ASC
         LIMIT ?
       )`
    )
      .bind(userId, characterId, userId, characterId, deleteCount)
      .run();
  }

  // メッセージを保存
  // 【新仕様】is_guest_messageは常に0（使用しない）
  const isGuestMessage = 0;

  // ユーザーメッセージを保存
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  try {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage)
      .run();
  } catch {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage)
      .run();
  }

  // アシスタントメッセージを保存
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  try {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage)
      .run();
  } catch {
    await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage)
      .run();
  }
}

// ===== LLM API 呼び出し =====

/**
 * DeepSeek API を呼び出し（リトライ付き）
 */
async function callDeepSeek(params: LLMRequestParams): Promise<LLMResponseResult> {
  const {
    systemPrompt,
    conversationHistory,
    userMessage,
    temperature,
    maxTokens,
    topP,
    deepseekApiKey,
  } = params;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let lastError = 'DeepSeek API did not respond';

  for (let attempt = 1; attempt <= MAX_DEEPSEEK_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const message = data?.choices?.[0]?.message?.content;
        return {
          success: Boolean(message?.trim()),
          message: message?.trim(),
          provider: 'deepseek',
          rawResponse: data,
        };
      }

      const errorText = await response.text();
      lastError = extractErrorMessage(errorText, 'Failed to get response from DeepSeek API');
      console.error('DeepSeek API error:', { attempt, status: response.status, errorText });

      // サービスビジーエラー以外は即座にリトライを中止
      if (!isServiceBusyError(response.status, errorText)) {
        return { success: false, error: lastError, status: response.status };
      }

      // リトライ前に待機
      if (attempt < MAX_DEEPSEEK_RETRIES) {
        await sleep(300 * attempt * attempt);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown DeepSeek error';
      lastError = message;
      console.error('DeepSeek API fetch error:', { attempt, message });
      if (attempt < MAX_DEEPSEEK_RETRIES) {
        await sleep(300 * attempt * attempt);
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * OpenAI API を呼び出し（フォールバック）
 */
async function callOpenAI(params: LLMRequestParams): Promise<LLMResponseResult> {
  const {
    systemPrompt,
    conversationHistory,
    userMessage,
    temperature,
    maxTokens,
    topP,
    fallbackApiKey,
    fallbackModel,
  } = params;

  if (!fallbackApiKey) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fallbackApiKey}`,
      },
      body: JSON.stringify({
        model: fallbackModel || DEFAULT_FALLBACK_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const message = data?.choices?.[0]?.message?.content;
      return {
        success: Boolean(message?.trim()),
        message: message?.trim(),
        provider: 'openai',
        rawResponse: data,
      };
    }

    const errorText = await response.text();
    const errorMessage = extractErrorMessage(errorText, 'Failed to get response from OpenAI API');
    console.error('OpenAI API error:', { status: response.status, errorText });
    return { success: false, error: errorMessage, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
    console.error('OpenAI API fetch error:', { message });
    return { success: false, error: message };
  }
}

/**
 * LLM レスポンスを取得（DeepSeek → OpenAI フォールバック）
 */
async function getLLMResponse(params: LLMRequestParams): Promise<LLMResponseResult> {
  console.log('[LLM] DeepSeek API を呼び出します...');
  const deepseekResult = await callDeepSeek(params);

  if (deepseekResult.success) {
    console.log('[LLM] ✅ DeepSeek API から応答を取得しました');
    return deepseekResult;
  }

  console.log('[LLM] ⚠️ DeepSeek API 失敗、OpenAI にフォールバック:', deepseekResult.error);
  const openaiResult = await callOpenAI(params);

  if (openaiResult.success) {
    console.log('[LLM] ✅ OpenAI API から応答を取得しました');
    return openaiResult;
  }

  console.error('[LLM] ❌ 両方の API が失敗しました');
  return {
    success: false,
    error: `DeepSeek: ${deepseekResult.error}, OpenAI: ${openaiResult.error}`,
    status: openaiResult.status,
  };
}

// ===== メインハンドラー =====

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ===== 1. 環境変数とリクエストボディの検証 =====
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'API key is not configured',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 500, headers: corsHeaders }
      );
    }

    let body: RequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    // メッセージ検証
    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return new Response(
        JSON.stringify({
          error: 'message field is required and must be a non-empty string',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length > 1000) {
      return new Response(
        JSON.stringify({
          error: 'message is too long (maximum 1000 characters)',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    // キャラクター検証
    const characterId = body.character || 'kaede';
    if (!isValidCharacter(characterId)) {
      return new Response(
        JSON.stringify({
          error: `Invalid character ID: ${characterId}. Valid characters are: kaede, yukino, sora, kaon`,
          message: '',
          character: characterId,
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    // ===== 2. ユーザーの識別（user_idを優先的に使用） =====
    const { userId: requestUserId, nickname, birthYear, birthMonth, birthDay } = body;
    
    let userRecord: { id: number; nickname: string | null; guardian: string | null } | null = null;

    // 【変更】user_idを優先的に使用（より安全で効率的）
    if (requestUserId && typeof requestUserId === 'number' && requestUserId > 0) {
      userRecord = await env.DB.prepare<{ id: number; nickname: string | null; guardian: string | null }>(
        'SELECT id, nickname, guardian FROM users WHERE id = ?'
      )
        .bind(requestUserId)
        .first();
    }

    // user_idで取得できない場合、nickname + 生年月日で取得（後方互換性のため）
    if (!userRecord && nickname && typeof birthYear === 'number' && typeof birthMonth === 'number' && typeof birthDay === 'number') {
      userRecord = await env.DB.prepare<{ id: number; nickname: string | null; guardian: string | null }>(
        'SELECT id, nickname, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
      )
        .bind(nickname.trim(), birthYear, birthMonth, birthDay)
        .first();
    }

    if (!userRecord) {
      return new Response(
        JSON.stringify({
          error: 'ユーザーが見つかりませんでした。入口フォームでユーザーを作成してください。',
          message: '',
          character: characterId,
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: 404, headers: corsHeaders }
      );
    }

    // ユーザー情報を取得
    const userId = userRecord.id;
    const user: { id: number; nickname: string; guardian: string | null } = {
      id: userRecord.id,
      nickname: userRecord.nickname || '',
      guardian: userRecord.guardian,
    };

    // last_activity_atを更新
    await env.DB.prepare('UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(userId)
      .run();

    console.log('[consult] ✅ ユーザーを取得しました:', {
      userId,
      nickname: user.nickname,
    });

    // ===== 4. キャラクター名の取得 =====
    // 注：機械的な危険ワードチェックは廃止しました
    // AIに文脈理解と共感的対応を委ねます（システムプロンプトに安全ガイドライン追加済み）
    const characterName = getCharacterName(characterId);

    // ===== 6. 会話履歴の取得 =====
    const sanitizedHistory = sanitizeClientHistory(body.clientHistory);
    let conversationHistory: ClientHistoryEntry[] = [];
    let dbHistoryOnly: ClientHistoryEntry[] = []; // データベースから取得した履歴のみ（hasPreviousConversation判定用）

    // ===== ユーザーの履歴取得 =====
    if (user) {
      try {
        const dbHistory = await getConversationHistory(env.DB, user.id, characterId);
        dbHistoryOnly = dbHistory; // データベース履歴を保存
        // 移行後は、is_guest_message = 1として保存し、登録ユーザーの履歴として扱う
        if (body.migrateHistory && sanitizedHistory.length > 0) {
          console.log('[consult] ゲスト履歴を登録ユーザーに移行します:', sanitizedHistory.length, '件');
          for (const entry of sanitizedHistory) {
            try {
              await env.DB.prepare(
                `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
                 VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
              )
                .bind(user.id, characterId, entry.role, entry.content)
                .run();
            } catch (error) {
              // timestampカラムが存在しない場合はcreated_atのみを使用
              await env.DB.prepare(
                `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
                 VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
              )
                .bind(user.id, characterId, entry.role, entry.content)
                .run();
            }
          }
          // 移行した履歴とDB履歴をマージ（LLMへの入力用）
          conversationHistory = [...sanitizedHistory, ...dbHistory];
          // 移行後は、データベース履歴に移行した履歴も含まれるため、dbHistoryOnlyも更新
          dbHistoryOnly = [...sanitizedHistory, ...dbHistory];
        } else {
          conversationHistory = dbHistory;
        }
      } catch (error) {
        console.error('[consult] 登録ユーザーの履歴取得エラー:', error);
        // エラーが発生した場合はクライアントから送られてきた履歴を使用（LLMへの入力用）
        conversationHistory = sanitizedHistory;
        // ただし、hasPreviousConversation判定には使用しない（dbHistoryOnlyは空のまま）
        dbHistoryOnly = [];
      }
    } else {
      // セッションIDが取得できない場合はクライアントから送られてきた履歴を使用（LLMへの入力用）
      conversationHistory = sanitizedHistory;
      // ただし、hasPreviousConversation判定には使用しない（dbHistoryOnlyは空のまま）
      dbHistoryOnly = [];
    }

    console.log('[consult] 会話履歴:', {
      total: conversationHistory.length,
      fromDatabase: dbHistoryOnly.length,
      fromClient: sanitizedHistory.length,
    });

    // ===== 6. 守護神が決定済みの場合、確認メッセージを会話履歴に注入 =====
    // 【改善】守護神の情報は会話履歴に注入するのではなく、システムプロンプトで処理
    // （各キャラクターの性格設定に必要な情報のみを渡す）

    // ===== 7. ユーザーメッセージ数の計算 =====
    // 会話履歴から計算（ゲスト・登録ユーザー共通）
    const userMessagesInHistory = conversationHistory.filter((msg) => msg.role === 'user').length;
    const userMessageCount = userMessagesInHistory + 1;
    console.log('[consult] ユーザーメッセージ数（履歴から計算）:', {
      userMessagesInHistory: userMessagesInHistory,
      userMessageCount: userMessageCount,
      conversationHistoryLength: conversationHistory.length,
    });

    // ===== 8. 守護神の儀式開始メッセージかどうかを判定 =====

    // ===== 9. 守護神の儀式開始メッセージかどうかを判定 =====
    const isRitualStart =
      trimmedMessage.includes('守護神の儀式を始めてください') ||
      trimmedMessage.includes('守護神の儀式を始めて') ||
      trimmedMessage === '守護神の儀式を始めてください';
    
    // 守護神の儀式開始通知の処理
    // ritualStartフラグがtrueの場合、チャットクリア指示を返す
    const shouldClearChat = body.ritualStart === true || isRitualStart;

    // ===== 9.5. 守護神の儀式が必要かどうかを判定（カエデの場合のみ）=====
    // カエデの場合、守護神が未登録かつ儀式開始メッセージの場合、守護神を決定してリダイレクト
    let shouldRedirectToGuardianRitual = false;
    let guardianInfo: { id: string; name: string; image: string; message: string } | null = null;
    
    if (characterId === 'kaede' && !user.guardian && isRitualStart) {
      try {
        // ユーザーの生年月日をデータベースから取得
        const userBirthday = await env.DB.prepare<{ birth_year: number; birth_month: number; birth_day: number }>(
          'SELECT birth_year, birth_month, birth_day FROM users WHERE id = ?'
        )
          .bind(userId)
          .first();

        if (userBirthday && userBirthday.birth_year && userBirthday.birth_month && userBirthday.birth_day) {
          // 守護神を決定（guardian.jsのロジックを移植）
          const GUARDIANS = [
            { id: '天照大神', name: '天照大神', image: 'amaterasu.png', message: 'あなたは天照大神に守られています。太陽のように明るく、前向きな力を授かっています。' },
            { id: '大国主命', name: '大国主命', image: 'okuni-nushi.png', message: 'あなたは大国主命に守られています。豊かさと調和の力を授かっています。' },
            { id: '大日如来', name: '大日如来', image: 'dainithi-nyorai.png', message: 'あなたは大日如来に守られています。智慧と光明の力を授かっています。' },
            { id: '千手観音', name: '千手観音', image: 'senju.png', message: 'あなたは千手観音に守られています。慈悲と救済の力を授かっています。' },
            { id: '不動明王', name: '不動明王', image: 'fudo.png', message: 'あなたは不動明王に守られています。不動の意志と守護の力を授かっています。' }
          ];

          const yearStr = String(userBirthday.birth_year).padStart(4, '0');
          const monthStr = String(userBirthday.birth_month).padStart(2, '0');
          const dayStr = String(userBirthday.birth_day).padStart(2, '0');
          const numericDate = parseInt(`${yearStr}${monthStr}${dayStr}`, 10);
          const remainder = numericDate % 5;
          guardianInfo = GUARDIANS[remainder];

          if (guardianInfo) {
            // データベースに守護神を保存
            await env.DB.prepare('UPDATE users SET guardian = ? WHERE id = ?')
              .bind(guardianInfo.id, userId)
              .run();

            console.log('[consult] ✅ 守護神を決定してデータベースに保存しました:', {
              userId,
              guardianId: guardianInfo.id,
              guardianName: guardianInfo.name,
            });

            shouldRedirectToGuardianRitual = true;
          }
        } else {
          console.error('[consult] ❌ ユーザーの生年月日情報が取得できませんでした:', userId);
        }
      } catch (error) {
        console.error('[consult] ❌ 守護神の決定・保存エラー:', {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
      }
    }

    // ===== 10. 最後のメッセージを抽出 =====
    // 【新仕様】すべてのユーザーを'registered'として扱うため、この処理は不要
    let lastGuestMessage: string | null = null;

    // ===== 11. システムプロンプトの生成 =====
    // 【改善】システムプロンプトをシンプルに：各鑑定士の性格設定だけを守らせる
    // 登録直後の初回メッセージ判定：migrateHistoryフラグがtrueの場合、登録したばかり
    // 【新仕様】すべてのユーザーを'registered'として扱う
    const isJustRegistered = body.migrateHistory === true;
    
    // 【重要】hasPreviousConversationの判定
    // データベースから取得した履歴のみで判定する（クライアントから送られてきた履歴は無視）
    // これにより、クライアント側のsessionStorageに履歴が残っていても、
    // データベースに履歴がなければ「初回訪問」として正しく判定される
    const hasPreviousConversation = dbHistoryOnly.length > 0;
    
    console.log('[consult] 会話履歴判定:', {
      characterId,
      conversationHistoryLength: conversationHistory.length,
      dbHistoryOnlyLength: dbHistoryOnly.length,
      hasPreviousConversation,
    });
    
    // 【改善】最小限の情報のみを渡す：各鑑定士の性格設定に必要な情報だけ
    // ユーザーの性別と生年月日を取得（楓の完全版プロンプトに必要）
    let userGender: string | null = null;
    let userBirthDate: string | null = null;
    
    if (user) {
      try {
        const userInfo = await env.DB.prepare<{ gender: string | null; birth_year: number | null; birth_month: number | null; birth_day: number | null }>(
          'SELECT gender, birth_year, birth_month, birth_day FROM users WHERE id = ?'
        )
          .bind(user.id)
          .first();
        
        if (userInfo) {
          userGender = userInfo.gender || null;
          if (userInfo.birth_year && userInfo.birth_month && userInfo.birth_day) {
            const yearStr = String(userInfo.birth_year).padStart(4, '0');
            const monthStr = String(userInfo.birth_month).padStart(2, '0');
            const dayStr = String(userInfo.birth_day).padStart(2, '0');
            userBirthDate = `${yearStr}-${monthStr}-${dayStr}`;
          }
        }
      } catch (error) {
        console.error('[consult] ユーザー情報取得エラー:', error);
      }
    }
    
    const systemPrompt = generateSystemPrompt(characterId, {
      userNickname: user?.nickname,
      hasPreviousConversation: hasPreviousConversation,
      // 各キャラクターの性格設定に必要な情報のみ
      guardian: user?.guardian || null,
      isRitualStart: isRitualStart,
      isJustRegistered: isJustRegistered,
      lastGuestMessage: lastGuestMessage,
      userMessageCount: userMessageCount,
      userGender: userGender,
      userBirthDate: userBirthDate,
    });

    console.log('[consult] システムプロンプト生成:', {
      characterId,
      userNickname: user?.nickname,
      guardian: user?.guardian,
      userMessageCount,
      isRitualStart,
      userGender,
      userBirthDate,
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 500) + '...',
    });

    // ===== 10. ユーザーメッセージの保存（2段階保存の第1段階）=====
    // 会話開始時に即座にユーザーメッセージを保存（LLM応答前）
    if (!shouldClearChat && !isJustRegistered) {
      try {
        // 【新仕様】すべてのユーザーを'registered'として扱う
        if (user) {
          await saveUserMessage(env.DB, user.id, characterId, trimmedMessage);
          console.log('[consult] ユーザーのメッセージを保存しました:', {
            userId: user.id,
            characterId,
          });
        } else {
          // ユーザーIDが取得できなかった場合のエラーログ
          console.error('[consult] ユーザーIDが取得できませんでした。nicknameと生年月日を確認してください。');
        }
      } catch (error) {
        console.error('[consult] ユーザーメッセージの保存エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: user?.id,
          characterId,
        });
        // エラーが発生してもレスポンスは返す（メッセージの保存は重要だが、致命的ではない）
      }
    }

    // ===== 11. LLM API の呼び出し =====
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    // 楓の完全版プロンプトは長いため、maxTokensを増やす
    const maxTokensForCharacter = characterId === 'kaede' ? 2000 : 800;
    const temperatureForCharacter = characterId === 'kaede' ? 0.7 : 0.5; // 楓の完全版では少し高い温度で神秘性を出す
    const topPForCharacter = characterId === 'kaede' ? 0.9 : 0.8;
    
    console.log('[consult] LLM API呼び出し準備:', {
      characterId,
      systemPromptLength: systemPrompt.length,
      conversationHistoryLength: conversationHistory.length,
      maxTokens: maxTokensForCharacter,
      temperature: temperatureForCharacter,
      topP: topPForCharacter,
    });
    
    const llmResult = await getLLMResponse({
      systemPrompt,
      conversationHistory,
      userMessage: trimmedMessage,
      temperature: temperatureForCharacter,
      maxTokens: maxTokensForCharacter,
      topP: topPForCharacter,
      deepseekApiKey: apiKey,
      fallbackApiKey,
      fallbackModel,
    });

    if (!llmResult.success || !llmResult.message) {
      const errorMessage = llmResult.error || '申し訳ございませんが、応答を生成できませんでした。';
      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: '',
          character: characterId,
          characterName,
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: llmResult.status || 503, headers: corsHeaders }
      );
    }

    const responseMessage = llmResult.message;
    console.log('[consult] LLM応答取得成功:', {
      provider: llmResult.provider,
      messageLength: responseMessage.length,
    });

    // ===== 12. タロットカード検出（笹岡雪乃の場合のみ）=====
    const tarotKeywords = [
      'タロット',
      'タロットカード',
      'カードを',
      'カードをめく',
      'カードを占',
      'カードを引',
    ];
    const showTarotCard =
      characterId === 'yukino' && tarotKeywords.some((keyword) => responseMessage.includes(keyword));

    // ===== 15. アシスタントメッセージの保存（2段階保存の第2段階）=====
    // LLM応答後にアシスタントメッセージを保存
    if (!shouldClearChat && !isJustRegistered) {
      try {
        // 【新仕様】すべてのユーザーを'registered'として扱う
        if (user) {
          await saveAssistantMessage(env.DB, user.id, characterId, responseMessage);
          console.log('[consult] アシスタントメッセージを保存しました:', {
            userId: user.id,
            characterId,
          });
        } else {
          // ユーザーIDが取得できなかった場合のエラーログ
          console.error('[consult] ユーザーIDが取得できませんでした。nicknameと生年月日を確認してください。');
        }
      } catch (error) {
        console.error('[consult] アシスタントメッセージの保存エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: user?.id,
          characterId,
        });
        // エラーが発生してもレスポンスは返す（メッセージの保存は重要だが、致命的ではない）
      }
    }

    // ===== 16. レスポンスを返す =====
    // 守護神の儀式へのリダイレクトが必要な場合、汎用的なリダイレクト指示を返す
    if (shouldRedirectToGuardianRitual && guardianInfo) {
      // 相対パスでURLを構築（チャット本体が特定のページを知る必要がない）
      const searchParams = new URLSearchParams();
      searchParams.set('guardianId', guardianInfo.id);
      searchParams.set('guardianName', guardianInfo.name);
      searchParams.set('guardianImage', guardianInfo.image);
      searchParams.set('guardianMessage', guardianInfo.message);
      searchParams.set('userId', String(userId));
      if (user.nickname) {
        searchParams.set('nickname', user.nickname);
      }
      const redirectUrl = `../guardian-ritual.html?${searchParams.toString()}`;

      console.log('[consult] 守護神の儀式へのリダイレクト指示:', redirectUrl);

      return new Response(
        JSON.stringify({
          message: responseMessage,
          character: characterId,
          characterName,
          isInappropriate: false,
          detectedKeywords: [],
          guestMode: false,
          showTarotCard: false,
          provider: llmResult.provider,
          clearChat: false,
          redirect: true,
          redirectUrl: redirectUrl, // 相対パスで返す（汎用的）
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        message: responseMessage,
        character: characterId,
        characterName,
        isInappropriate: false,
        detectedKeywords: [],
        guestMode: false, // 【新仕様】すべてのユーザーを登録ユーザーとして扱う
        showTarotCard: showTarotCard,
        provider: llmResult.provider,
        clearChat: shouldClearChat, // 儀式開始時はチャットクリア指示
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // エラーハンドリング
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[consult] エラーが発生しました:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
        character: '',
        characterName: '',
        isInappropriate: false,
        detectedKeywords: [],
      } as ResponseBody),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
