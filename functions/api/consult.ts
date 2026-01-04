// Cloudflare Pages Functions の型定義
import { generateSystemPrompt, getCharacterName } from '../_lib/character-system.js';
import { isValidCharacter } from '../_lib/character-loader.js';
import { verifyUserToken } from '../_lib/token.js';

// ===== 定数 =====
const GUEST_MESSAGE_LIMIT = 10;
const MAX_DEEPSEEK_RETRIES = 3;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';

// ===== 型定義 =====
type ConversationRole = 'user' | 'assistant';

interface ClientHistoryEntry {
  role: ConversationRole;
  content: string;
  isGuestMessage?: boolean;
}

interface GuestMetadata {
  messageCount?: number;
  sessionId?: string;
}

interface RequestBody {
  message: string;
  character?: string;
  userToken?: string;
  clientHistory?: ClientHistoryEntry[];
  migrateHistory?: boolean;
  guestMetadata?: GuestMetadata;
  ritualStart?: boolean; // 守護神の儀式開始通知フラグ
}

interface ResponseBody {
  message: string;
  character: string;
  characterName: string;
  isInappropriate: boolean;
  detectedKeywords: string[];
  error?: string;
  needsRegistration?: boolean;
  registrationSuggested?: boolean;
  guestMode?: boolean;
  remainingGuestMessages?: number;
  showTarotCard?: boolean;
  provider?: 'deepseek' | 'openai';
  clearChat?: boolean; // チャットクリア指示フラグ（APIからの指示）
  guestSessionId?: string; // ゲストセッションID（クライアントに返す）
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
 * ゲストセッションIDを生成（IPアドレスとUser-Agentから）
 */
async function generateGuestSessionId(ipAddress: string | null, userAgent: string | null): Promise<string> {
  const data = `${ipAddress || 'unknown'}_${userAgent || 'unknown'}_${Date.now()}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

/**
 * ゲストユーザーを取得または作成（統一ユーザーテーブル設計）
 */
async function getOrCreateGuestUser(
  db: D1Database,
  sessionId: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<number> {
  if (sessionId) {
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE session_id = ? AND user_type = ?')
      .bind(sessionId, 'guest')
      .first<{ id: number }>();
    
    if (existingUser) {
      await db
        .prepare('UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(existingUser.id)
        .run();
      return existingUser.id;
    }
  }

  const newSessionId = sessionId || await generateGuestSessionId(ipAddress, userAgent);
  const result = await db
    .prepare('INSERT INTO users (user_type, ip_address, session_id, last_activity_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .bind('guest', ipAddress || null, newSessionId)
    .run();

  const guestUserId = result.meta?.last_row_id;
  if (!guestUserId || typeof guestUserId !== 'number') {
    console.error('[getOrCreateGuestUser] last_row_id is invalid:', guestUserId, typeof guestUserId);
    throw new Error(`Failed to create guest user: last_row_id is ${guestUserId}`);
  }
  return guestUserId;
}

/**
 * ゲストユーザーの総メッセージ数を取得（全キャラクター合計）
 */
async function getTotalGuestMessageCount(
  db: D1Database,
  guestUserId: number
): Promise<number> {
  // 【ポジティブな指定】ゲストユーザーのメッセージ数を取得
  // usersテーブルに存在し、user_type = 'guest'のユーザーのみを対象とする
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count 
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND u.user_type = 'guest' AND c.role = 'user'`
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
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string
): Promise<ClientHistoryEntry[]> {
  if (userType === 'registered') {
    // 【ポジティブな指定】登録ユーザーの履歴取得
    // usersテーブルに存在し、user_type = 'registered'かつnicknameを持つユーザーのみを対象とする
    const historyResults = await db.prepare<ConversationRow>(
      `SELECT c.role, c.message as content, c.is_guest_message
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'registered' AND u.nickname IS NOT NULL
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(userId, characterId)
      .all();

    return historyResults.results?.slice().reverse().map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: row.is_guest_message === 1,
    })) ?? [];
  } else {
    // 【ポジティブな指定】ゲストユーザーの履歴取得
    // usersテーブルに存在し、user_type = 'guest'のユーザーのみを対象とする
    const historyResults = await db.prepare<ConversationRow>(
      `SELECT c.role, c.message as content, c.is_guest_message
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'guest'
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(userId, characterId)
      .all();

    return historyResults.results?.slice().reverse().map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
      isGuestMessage: true,
    })) ?? [];
  }
}

/**
 * 会話履歴を保存（共通関数）
 */
async function saveConversationHistory(
  db: D1Database,
  userType: 'registered' | 'guest',
  userId: number,
  characterId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  // 100件制限チェック
  let messageCountResult;
  if (userType === 'registered') {
    messageCountResult = await db.prepare<{ count: number }>(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ?`
    )
      .bind(userId, characterId)
      .first();
  } else {
    // 【ポジティブな指定】ゲストユーザーのメッセージ数を取得
    // usersテーブルに存在し、user_type = 'guest'のユーザーのみを対象とする
    messageCountResult = await db.prepare<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'guest'`
    )
      .bind(userId, characterId)
      .first();
  }

  const messageCount = messageCountResult?.count || 0;

  if (messageCount >= 100) {
    const deleteCount = messageCount - 100 + 2;
    if (userType === 'registered') {
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
    } else {
      // 【ポジティブな指定】ゲストユーザーの古いメッセージを削除
      // usersテーブルに存在し、user_type = 'guest'のユーザーのみを対象とする
      await db.prepare(
        `DELETE FROM conversations
         WHERE user_id = ? AND character_id = ?
         AND user_id IN (SELECT id FROM users WHERE id = ? AND user_type = 'guest')
         AND id IN (
           SELECT c.id FROM conversations c
           INNER JOIN users u ON c.user_id = u.id
           WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'guest'
           ORDER BY COALESCE(c.timestamp, c.created_at) ASC
           LIMIT ?
         )`
      )
        .bind(userId, characterId, userId, userId, characterId, deleteCount)
        .run();
    }
  }

  // メッセージを保存
  const isGuestMessage = userType === 'guest' ? 1 : 0;

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

    // ===== 2. ユーザータイプの明確な判定（2択）=====
    // 【改善】明確な2択判定: userTypeが'registered'または'guest'のどちらかになる
    let userType: 'registered' | 'guest' = 'guest';
    let user: UserRecord | null = null;
    let guestSessionId: number | null = null;
    let guestSessionIdStr: string | null = null;

    // 登録ユーザーの判定（すべての条件を満たした場合のみ）
    if (body.userToken) {
      const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
      if (tokenPayload) {
        const record = await env.DB.prepare<UserRecord>(
          'SELECT id, nickname, guardian FROM users WHERE id = ?'
        )
          .bind(tokenPayload.userId)
          .first();

        if (record) {
          user = record;
          userType = 'registered'; // 明確に登録ユーザーとして設定
          console.log('[consult] 登録ユーザー:', {
            id: user.id,
            nickname: user.nickname,
            guardian: user.guardian,
          });
        }
      }
      // トークンが無効、またはユーザーが存在しない場合は、userType = 'guest'のまま
      // エラーを返さず、ゲストユーザーとして処理を続行
    }

    // ===== 3. ゲストユーザーのセッション管理 =====
    // 【ポジティブな指定】ゲストユーザーは以下の条件を満たす：
    // 1. userTokenが存在しない、または無効、またはユーザーがデータベースに存在しない
    // 2. usersテーブルに存在するが、user_type = 'guest'である（ニックネームを持たない）
    // 3. IPアドレス（ip_address）とセッションID（session_id）のみで識別される
    // 
    // 【重要】統一ユーザーテーブル設計により、すべてのユーザーはusersテーブルで管理される：
    // - user_id: usersテーブルの主キー（データベース内の一意識別子）
    // - session_id: usersテーブルの一意文字列（ブラウザセッション識別子、UUID形式）
    // - user_type: 'guest' | 'registered'（ユーザー種別）
    // ゲストユーザーは、session_idで識別され、user_idでデータベースに保存される
    const ipAddress = request.headers.get('CF-Connecting-IP');
    const userAgent = request.headers.get('User-Agent');

    if (userType === 'guest') {
      // ゲストユーザーの場合、セッションを取得または作成
      const guestMetadata = body.guestMetadata || {};
      guestSessionIdStr = guestMetadata.sessionId || null;
      
      try {
        guestSessionId = await getOrCreateGuestUser(env.DB, guestSessionIdStr, ipAddress, userAgent);
        console.log('[consult] ゲストユーザー:', {
          guestUserId: guestSessionId, // データベース内のuser_id（usersテーブルの主キー）
          sessionId: guestSessionIdStr, // ブラウザセッション識別子（UUID形式）
          ipAddress,
        });
      } catch (error) {
        console.error('[consult] ゲストユーザー作成エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          sessionId: guestSessionIdStr,
          ipAddress,
        });
        // エラーが発生した場合は、再試行（セッションIDなしで作成を試みる）
        try {
          guestSessionId = await getOrCreateGuestUser(env.DB, null, ipAddress, userAgent);
          console.log('[consult] ゲストユーザー作成（再試行成功）:', {
            guestUserId: guestSessionId,
            ipAddress,
          });
        } catch (retryError) {
          console.error('[consult] ゲストユーザー作成（再試行も失敗）:', {
            error: retryError instanceof Error ? retryError.message : String(retryError),
            stack: retryError instanceof Error ? retryError.stack : undefined,
          });
          // 再試行も失敗した場合は、会話履歴の保存をスキップする（エラーを返さない）
        }
      }
    }

    // ===== 4. ゲストユーザーのメッセージ制限チェック =====
    const guestMetadata = body.guestMetadata || {};
    let guestMessageCount = Number(guestMetadata.messageCount ?? 0);
    let sanitizedGuestCount = Number.isFinite(guestMessageCount) ? guestMessageCount : 0;

    // データベースから総メッセージ数を取得（より正確）
    if (userType === 'guest' && guestSessionId) {
      try {
        const totalCount = await getTotalGuestMessageCount(env.DB, guestSessionId);
        sanitizedGuestCount = totalCount;
        console.log('[consult] データベースから取得したゲストメッセージ数:', {
          totalCount,
          clientCount: guestMessageCount,
        });
      } catch (error) {
        console.error('[consult] ゲストメッセージ数取得エラー:', error);
        // エラーが発生した場合はクライアントから送られてきた値を使用
      }
    } else if (userType === 'guest' && !guestSessionId) {
      // guestSessionIdが取得できなかった場合でも、会話は続行できるようにする
      console.warn('[consult] ゲストユーザーIDが取得できませんでした。クライアントから送られてきたメッセージ数を使用します。');
    }

    // ゲストユーザーで10通目に達した場合
    if (userType === 'guest' && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT) {
      const characterName = getCharacterName(characterId);
      let registrationMessage: string;
      
      if (characterId === 'kaede') {
        registrationMessage = '無料でお話できるのはここまでです。守護神を最後まで導き出すには、あなたの生年月日が必要です。生年月日は、その人が生まれた瞬間の宇宙の配置を表し、龍神を通じて正確に守護神を導き出すための重要な鍵となります。そのため、生年月日とニックネームをユーザー登録していただく必要があります。登録は無料で、個人情報は厳重に管理されます。費用や危険は一切ありませんので、ご安心ください。登録ボタンから手続きを進めてください。';
      } else if (characterId === 'yukino') {
        registrationMessage = '（優しく微笑みながら）ここまでたくさんお話を聞かせていただき、ありがとうございました。無料でお話できるのはここまでなんです。これ以上のタロット鑑定や深い相談を続けるには、ユーザー登録をお願いしています。生年月日とニックネームを教えていただくことで、より詳しい鑑定ができるようになります。登録は無料で、個人情報も厳重に管理しますし、特別な費用がかかったり、危険なことが起こるわけでもありませんので、どうぞご安心くださいね。登録ボタンから手続きを進めてください。';
      } else if (characterId === 'sora') {
        registrationMessage = '（少し申し訳なさそうに笑って）悪い、無料で話せるのはここまでなんだ。もっと君のこと深く知りたいんだけど、そのためには生年月日とニックネームが必要なんだよね。生年月日があれば、君の本質をもっと正確に読み解けるようになるから。登録は無料だし、個人情報もちゃんと守られるから安心して。お金がかかったり、変なことに使われたりすることは絶対ないから。俺、君ともっと話したいんだ。登録ボタンから手続きしてくれると嬉しい。';
      } else {
        registrationMessage = 'これ以上鑑定を続けるには、ユーザー登録が必要です。生年月日とニックネームを教えていただくことで、より深い鑑定ができるようになります。登録ボタンから手続きをお願いします。';
      }

      return new Response(
        JSON.stringify({
          needsRegistration: true,
          error: 'Guest message limit reached',
          message: registrationMessage,
          character: characterId,
          characterName: characterName,
          isInappropriate: false,
          detectedKeywords: [],
          guestMode: true,
          remainingGuestMessages: 0,
          registrationSuggested: true,
          guestSessionId: guestSessionIdStr || undefined,
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

    // ===== 5. キャラクター名の取得 =====
    // 注：機械的な危険ワードチェックは廃止しました
    // AIに文脈理解と共感的対応を委ねます（システムプロンプトに安全ガイドライン追加済み）
    const characterName = getCharacterName(characterId);

    // ===== 6. 会話履歴の取得 =====
    const sanitizedHistory = sanitizeClientHistory(body.clientHistory);
    let conversationHistory: ClientHistoryEntry[] = [];
    let dbHistoryOnly: ClientHistoryEntry[] = []; // データベースから取得した履歴のみ（hasPreviousConversation判定用）

    if (userType === 'registered' && user) {
      // ===== 登録ユーザーの履歴取得 =====
      try {
        const dbHistory = await getConversationHistory(env.DB, 'registered', user.id, characterId);
        dbHistoryOnly = dbHistory; // データベース履歴を保存

        // ===== ゲストユーザーから登録ユーザーへの移行処理 =====
        // 【ゲストユーザーが登録ユーザーになる条件】
        // 1. ゲストユーザーが10通のメッセージ制限に達した
        // 2. ユーザー登録フォームでニックネームと生年月日を入力した
        // 3. usersテーブルの既存レコード（user_type = 'guest'）を更新（user_type = 'registered'に変更）
        // 
        // 【重要】統一ユーザーテーブル設計により、移行は同一レコードの更新のみ：
        // - 移行前: usersテーブルのレコード（user_type = 'guest'、nickname = NULL）
        // - 移行後: usersテーブルの同じレコード（user_type = 'registered'、nickname = 入力値）
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
    } else if (userType === 'guest' && guestSessionId) {
      // ===== ゲストユーザーの履歴取得 =====
      try {
        const dbHistory = await getConversationHistory(env.DB, 'guest', guestSessionId, characterId);
        conversationHistory = dbHistory;
        dbHistoryOnly = dbHistory; // データベース履歴を保存
      } catch (error) {
        console.error('[consult] ゲストユーザーの履歴取得エラー:', error);
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
    // ゲストユーザーの場合：フロントエンドから送信された guestMetadata.messageCount を信頼
    // 登録ユーザーの場合：会話履歴から計算
    let userMessageCount: number;
    
    if (userType === 'guest') {
      // ゲストユーザー：guestMetadata.messageCount（これまでのメッセージ数）+ 1（今回のメッセージ）
      userMessageCount = sanitizedGuestCount + 1;
      console.log('[consult] ゲストユーザーのメッセージ数（guestMetadata優先）:', {
        sanitizedGuestCount: sanitizedGuestCount,
        userMessageCount: userMessageCount,
        conversationHistoryLength: conversationHistory.length,
      });
    } else {
      // 登録ユーザー：会話履歴から計算
      const userMessagesInHistory = conversationHistory.filter((msg) => msg.role === 'user').length;
      userMessageCount = userMessagesInHistory + 1;
      console.log('[consult] 登録ユーザーのメッセージ数（履歴から計算）:', {
        userMessagesInHistory: userMessagesInHistory,
        userMessageCount: userMessageCount,
        conversationHistoryLength: conversationHistory.length,
      });
    }

    // ===== 8. 登録促進フラグの設定 =====
    // ゲストユーザーで、9通目の場合に登録を促す（sanitizedGuestCount === 8 の時、次が9通目）
    const needsRegistration = userType === 'guest' && characterId === 'yukino' && sanitizedGuestCount === 8;

    // ===== 9. 守護神の儀式開始メッセージかどうかを判定 =====
    const isRitualStart =
      trimmedMessage.includes('守護神の儀式を始めてください') ||
      trimmedMessage.includes('守護神の儀式を始めて') ||
      trimmedMessage === '守護神の儀式を始めてください';

    // ===== 10. ゲストモード時の最後のメッセージを抽出 =====
    let lastGuestMessage: string | null = null;
    
    if (user && characterId === 'yukino') {
      // 雪乃の場合のみ、ゲストモード時の最後のユーザーメッセージをデータベースから取得
      // 【ポジティブな指定】登録ユーザーが以前ゲストユーザーだった場合の履歴を取得
      // usersテーブルに存在し、user_type = 'guest'のユーザーの履歴のみを対象とする
      // conversationHistoryには登録ユーザーの履歴のみが含まれるため、ゲスト履歴は別途取得する
      // 注意: このクエリは、登録ユーザーが以前ゲストユーザーだった場合の履歴を取得するため、
      // 現在のuser.idではなく、is_guest_message = 1のメッセージを検索する
      const guestMessageResult = await env.DB.prepare<ConversationRow>(
        `SELECT c.message as content
         FROM conversations c
         INNER JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ? AND c.character_id = ? AND c.role = 'user' AND u.user_type = 'guest'
         ORDER BY COALESCE(c.timestamp, c.created_at) DESC
         LIMIT 1`
      )
        .bind(user.id, characterId)
        .first();
      
      if (guestMessageResult) {
        lastGuestMessage = guestMessageResult.content || guestMessageResult.message || null;
        console.log('[consult] ゲストモード時の最後のメッセージを抽出:', {
          lastGuestMessage: lastGuestMessage?.substring(0, 50) + '...',
        });
      }
    }

    // ===== 11. システムプロンプトの生成 =====
    // 【改善】システムプロンプトをシンプルに：各鑑定士の性格設定だけを守らせる
    // 登録直後の初回メッセージ判定：migrateHistoryフラグがtrueの場合、ゲストから登録したばかり
    const isJustRegistered = userType === 'registered' && body.migrateHistory === true;
    
    // 【重要】hasPreviousConversationの判定
    // データベースから取得した履歴のみで判定する（クライアントから送られてきた履歴は無視）
    // これにより、クライアント側のsessionStorageに履歴が残っていても、
    // データベースに履歴がなければ「初回訪問」として正しく判定される
    const hasPreviousConversation = dbHistoryOnly.length > 0;
    
    console.log('[consult] 会話履歴判定:', {
      userType,
      characterId,
      conversationHistoryLength: conversationHistory.length,
      dbHistoryOnlyLength: dbHistoryOnly.length,
      hasPreviousConversation,
      guestSessionId,
    });
    
    // 【改善】最小限の情報のみを渡す：各鑑定士の性格設定に必要な情報だけ
    const systemPrompt = generateSystemPrompt(characterId, {
      userNickname: user?.nickname,
      hasPreviousConversation: hasPreviousConversation,
      // 各キャラクターの性格設定に必要な情報のみ
      guardian: user?.guardian || null,
      isRitualStart: isRitualStart,
      isJustRegistered: isJustRegistered,
      lastGuestMessage: lastGuestMessage,
    });

    console.log('[consult] システムプロンプト生成:', {
      characterId,
      userNickname: user?.nickname,
      guardian: user?.guardian,
      userMessageCount,
      needsRegistration,
      isRitualStart,
    });

    // ===== 11. LLM API の呼び出し =====
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    const llmResult = await getLLMResponse({
      systemPrompt,
      conversationHistory,
      userMessage: trimmedMessage,
      temperature: 0.5,
      maxTokens: 800,
      topP: 0.8,
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

    // ===== 13. 守護神の儀式開始通知の処理 =====
    // ritualStartフラグがtrueの場合、チャットクリア指示を返す
    const shouldClearChat = body.ritualStart === true;
    
    // ===== 15. 会話履歴の保存 =====
    if (!shouldClearChat && !isJustRegistered) {
      try {
        if (userType === 'registered' && user) {
          await saveConversationHistory(env.DB, 'registered', user.id, characterId, trimmedMessage, responseMessage);
          console.log('[consult] 登録ユーザーの会話履歴を保存しました');
        } else if (userType === 'guest') {
          if (guestSessionId) {
            await saveConversationHistory(env.DB, 'guest', guestSessionId, characterId, trimmedMessage, responseMessage);
            console.log('[consult] ゲストユーザーの会話履歴を保存しました:', {
              guestSessionId,
              characterId,
            });
          } else {
            // guestSessionIdが取得できなかった場合でも、最後の試行として再作成を試みる
            console.warn('[consult] ゲストユーザーIDが取得できませんでした。再作成を試みます...');
            try {
              const retryGuestSessionId = await getOrCreateGuestUser(env.DB, guestSessionIdStr, ipAddress, userAgent);
              await saveConversationHistory(env.DB, 'guest', retryGuestSessionId, characterId, trimmedMessage, responseMessage);
              console.log('[consult] ゲストユーザーの会話履歴を保存しました（再作成後）:', {
                guestSessionId: retryGuestSessionId,
                characterId,
              });
            } catch (retryError) {
              console.error('[consult] ゲストユーザーIDの再作成と履歴保存に失敗:', {
                error: retryError instanceof Error ? retryError.message : String(retryError),
                stack: retryError instanceof Error ? retryError.stack : undefined,
              });
              // エラーが発生してもレスポンスは返す（会話履歴の保存は重要だが、致命的ではない）
            }
          }
        }
      } catch (error) {
        console.error('[consult] 会話履歴の保存エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userType,
          userId: user?.id || guestSessionId,
          characterId,
        });
        // エラーが発生してもレスポンスは返す（会話履歴の保存は重要だが、致命的ではない）
      }
    }

    // ===== 16. レスポンスを返す =====
    return new Response(
      JSON.stringify({
        message: responseMessage,
        character: characterId,
        characterName,
        isInappropriate: false,
        detectedKeywords: [],
        needsRegistration: needsRegistration,
        guestMode: userType === 'guest',
        remainingGuestMessages: userType === 'guest'
          ? Math.max(0, GUEST_MESSAGE_LIMIT - (sanitizedGuestCount + 1))
          : undefined,
        showTarotCard: showTarotCard,
        provider: llmResult.provider,
        clearChat: shouldClearChat, // 儀式開始時はチャットクリア指示
        guestSessionId: guestSessionIdStr || undefined, // ゲストセッションIDを返す
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
