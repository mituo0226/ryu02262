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
 * ゲストセッションを取得または作成
 */
async function getOrCreateGuestSession(
  db: D1Database,
  sessionId: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<number> {
  if (sessionId) {
    const existingSession = await db
      .prepare('SELECT id FROM guest_sessions WHERE session_id = ?')
      .bind(sessionId)
      .first<{ id: number }>();
    
    if (existingSession) {
      await db
        .prepare('UPDATE guest_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(existingSession.id)
        .run();
      return existingSession.id;
    }
  }

  const newSessionId = sessionId || await generateGuestSessionId(ipAddress, userAgent);
  const result = await db
    .prepare('INSERT INTO guest_sessions (session_id, ip_address, user_agent) VALUES (?, ?, ?)')
    .bind(newSessionId, ipAddress || null, userAgent || null)
    .run();

  const guestSessionId = result.meta?.last_row_id;
  if (!guestSessionId) {
    throw new Error('Failed to create guest session');
  }
  return guestSessionId;
}

/**
 * ゲストユーザーの総メッセージ数を取得（全キャラクター合計）
 */
async function getTotalGuestMessageCount(
  db: D1Database,
  guestSessionId: number
): Promise<number> {
  // ⚠️ user_idがguest_sessionsテーブルに存在することを確認（登録ユーザーの履歴を除外）
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count 
       FROM conversations c
       INNER JOIN guest_sessions gs ON c.user_id = gs.id
       WHERE c.user_id = ? AND c.is_guest_message = 1 AND c.role = 'user'`
    )
    .bind(guestSessionId)
    .first<{ count: number }>();
  return result?.count || 0;
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

    // ===== 2. ユーザー情報の取得 =====
    let user: UserRecord | null = null;

    if (body.userToken) {
      const tokenPayload = await verifyUserToken(body.userToken, env.AUTH_SECRET);
      if (!tokenPayload) {
        return new Response(
          JSON.stringify({
            needsRegistration: true,
            error: 'invalid user token',
            message: '',
            character: characterId,
            characterName: '',
            isInappropriate: false,
            detectedKeywords: [],
          } as ResponseBody),
          { status: 401, headers: corsHeaders }
        );
      }

      const record = await env.DB.prepare<UserRecord>(
        'SELECT id, nickname, guardian FROM users WHERE id = ?'
      )
        .bind(tokenPayload.userId)
        .first();

      if (!record) {
        console.error('[consult] ユーザーがデータベースに存在しません:', tokenPayload.userId);
        return new Response(
          JSON.stringify({
            needsRegistration: true,
            error: 'user not found',
            message: '',
            character: characterId,
            characterName: '',
            isInappropriate: false,
            detectedKeywords: [],
          } as ResponseBody),
          { status: 401, headers: corsHeaders }
        );
      }

      user = record;
      console.log('[consult] ユーザー情報:', {
        id: user.id,
        nickname: user.nickname,
        guardian: user.guardian,
      });
    }

    // ===== 3. ゲストユーザーのセッション管理 =====
    const ipAddress = request.headers.get('CF-Connecting-IP');
    const userAgent = request.headers.get('User-Agent');
    let guestSessionId: number | null = null;
    let guestSessionIdStr: string | null = null;

    if (!user) {
      // ゲストユーザーの場合、セッションを取得または作成
      const guestMetadata = body.guestMetadata || {};
      guestSessionIdStr = guestMetadata.sessionId || null;
      
      try {
        guestSessionId = await getOrCreateGuestSession(env.DB, guestSessionIdStr, ipAddress, userAgent);
        console.log('[consult] ゲストセッション:', {
          guestSessionId,
          sessionId: guestSessionIdStr,
          ipAddress,
        });
      } catch (error) {
        console.error('[consult] ゲストセッション作成エラー:', error);
        // エラーが発生しても続行（セッション管理はオプショナル）
      }
    }

    // ===== 4. ゲストユーザーのメッセージ制限チェック =====
    const guestMetadata = body.guestMetadata || {};
    let guestMessageCount = Number(guestMetadata.messageCount ?? 0);
    let sanitizedGuestCount = Number.isFinite(guestMessageCount) ? guestMessageCount : 0;

    // データベースから総メッセージ数を取得（より正確）
    if (!user && guestSessionId) {
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
    }

    // ゲストユーザーで10通目に達した場合
    if (!user && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT) {
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

    if (user) {
      // 登録ユーザー：データベースから履歴を取得
      // ⚠️ ゲストメッセージ（is_guest_message = 1）は画面に表示しない
      // ⚠️ user_idがusersテーブルに存在することを確認（古いゲストユーザーの履歴を除外）
      const historyResults = await env.DB.prepare<ConversationRow>(
        `SELECT c.role, c.content, c.is_guest_message
         FROM conversations c
         INNER JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ? AND c.character_id = ? AND c.is_guest_message = 0
         ORDER BY COALESCE(c.timestamp, c.created_at) DESC
         LIMIT 20`
      )
        .bind(user.id, characterId)
        .all();

      const dbHistory =
        historyResults.results?.slice().reverse().map((row) => ({
          role: row.role,
          content: row.content || row.message || '', // contentを優先、後方互換性のためmessageも確認
          isGuestMessage: row.is_guest_message === 1,
        })) ?? [];

      // ゲスト履歴の移行処理（登録直後の場合）
      if (body.migrateHistory && sanitizedHistory.length > 0) {
        console.log('[consult] ゲスト履歴を移行します:', sanitizedHistory.length, '件');
        for (const entry of sanitizedHistory) {
          try {
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
               VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
            )
              .bind(user.id, characterId, entry.role, entry.content)
              .run();
          } catch (error) {
            // timestampカラムが存在しない場合はcreated_atのみを使用
            await env.DB.prepare(
              `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
               VALUES (?, ?, ?, ?, 'normal', 1, CURRENT_TIMESTAMP)`
            )
              .bind(user.id, characterId, entry.role, entry.content)
              .run();
          }
        }
        // 移行した履歴とDB履歴をマージ
        conversationHistory = [...sanitizedHistory, ...dbHistory];
      } else {
        conversationHistory = dbHistory;
      }
    } else {
      // ゲストユーザー：データベースから履歴を取得
      if (guestSessionId) {
        // ⚠️ user_idがguest_sessionsテーブルに存在することを確認（登録ユーザーの履歴を除外）
        const guestHistoryResults = await env.DB.prepare<ConversationRow>(
          `SELECT c.role, c.content, c.is_guest_message
           FROM conversations c
           INNER JOIN guest_sessions gs ON c.user_id = gs.id
           WHERE c.user_id = ? AND c.character_id = ? AND c.is_guest_message = 1
           ORDER BY COALESCE(c.timestamp, c.created_at) DESC
           LIMIT 20`
        )
          .bind(guestSessionId, characterId)
          .all();

        conversationHistory =
          guestHistoryResults.results?.slice().reverse().map((row) => ({
            role: row.role,
            content: row.content || row.message || '', // contentを優先、後方互換性のためmessageも確認
            isGuestMessage: true,
          })) ?? [];
      } else {
        // セッションIDが取得できない場合はクライアントから送られてきた履歴を使用
        conversationHistory = sanitizedHistory;
      }
    }

    console.log('[consult] 会話履歴:', conversationHistory.length, '件');

    // ===== 6. 守護神が決定済みの場合、確認メッセージを会話履歴に注入 =====
    if (user?.guardian && user.guardian.trim() !== '' && characterId === 'kaede') {
      const guardianName = user.guardian;
      const userNickname = user.nickname || 'あなた';

      // 守護神確認メッセージ
      const guardianConfirmationMessage = `${userNickname}さんの守護神は${guardianName}です。これからは、私と守護神である${guardianName}が鑑定を進めていきます。`;

      // 会話履歴に既に存在するかチェック
      const hasGuardianMessage = conversationHistory.some(
        (msg) =>
          msg.role === 'assistant' &&
          msg.content.includes(`${userNickname}さんの守護神は${guardianName}です`)
      );

      // まだ存在しない場合のみ追加
      if (!hasGuardianMessage) {
        conversationHistory.unshift({
          role: 'assistant',
          content: guardianConfirmationMessage,
        });
        console.log('[consult] 守護神確認メッセージを会話履歴に注入しました');
      }
    }

    // ===== 7. ユーザーメッセージ数の計算 =====
    // ゲストユーザーの場合：フロントエンドから送信された guestMetadata.messageCount を信頼
    // 登録ユーザーの場合：会話履歴から計算
    let userMessageCount: number;
    
    if (!user) {
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
    const needsRegistration = !user && characterId === 'yukino' && sanitizedGuestCount === 8;

    // ===== 9. 守護神の儀式開始メッセージかどうかを判定 =====
    const isRitualStart =
      trimmedMessage.includes('守護神の儀式を始めてください') ||
      trimmedMessage.includes('守護神の儀式を始めて') ||
      trimmedMessage === '守護神の儀式を始めてください';

    // ===== 10. ゲストモード時の最後のメッセージを抽出 =====
    let lastGuestMessage: string | null = null;
    
    if (user && characterId === 'yukino') {
      // 雪乃の場合のみ、ゲストモード時の最後のユーザーメッセージをデータベースから取得
      // ⚠️ conversationHistoryにはゲストメッセージが含まれないため、別途取得する
      // ⚠️ user_idがguest_sessionsテーブルに存在することを確認（登録ユーザーの履歴を除外）
      const guestMessageResult = await env.DB.prepare<ConversationRow>(
        `SELECT c.content
         FROM conversations c
         INNER JOIN guest_sessions gs ON c.user_id = gs.id
         WHERE c.user_id = ? AND c.character_id = ? AND c.role = 'user' AND c.is_guest_message = 1
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
    // 登録直後の初回メッセージ判定：migrateHistoryフラグがtrueの場合、ゲストから登録したばかり
    const isJustRegistered = user && body.migrateHistory === true;
    
    const systemPrompt = generateSystemPrompt(characterId, {
      needsRegistration: needsRegistration,
      userNickname: user?.nickname,
      hasPreviousConversation: conversationHistory.length > 0,
      conversationHistoryLength: conversationHistory.length,
      userMessageCount: userMessageCount,
      isRitualStart: isRitualStart,
      guardian: user?.guardian || null,
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
      if (user) {
        // 登録ユーザーの場合
        // 100件制限チェック
        const messageCountResult = await env.DB.prepare<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM conversations 
           WHERE user_id = ? AND character_id = ?`
        )
          .bind(user.id, characterId)
          .first();

        const messageCount = messageCountResult?.count || 0;

        if (messageCount >= 100) {
          // 古いメッセージを削除（100件を超える分）
          const deleteCount = messageCount - 100 + 2; // ユーザーとアシスタントの2件を追加するため
          await env.DB.prepare(
            `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ?
             AND id IN (
               SELECT id FROM conversations
               WHERE user_id = ? AND character_id = ?
               ORDER BY COALESCE(timestamp, created_at) ASC
               LIMIT ?
             )`
          )
            .bind(user.id, characterId, user.id, characterId, deleteCount)
            .run();
        }

        // ユーザーメッセージを保存
        try {
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
             VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
          )
            .bind(user.id, characterId, trimmedMessage)
            .run();
        } catch {
          // timestampカラムが存在しない場合はcreated_atのみを使用
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
             VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
          )
            .bind(user.id, characterId, trimmedMessage)
            .run();
        }

        // アシスタントメッセージを保存
        try {
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
             VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
          )
            .bind(user.id, characterId, responseMessage)
            .run();
        } catch {
          // timestampカラムが存在しない場合はcreated_atのみを使用
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
             VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
          )
            .bind(user.id, characterId, responseMessage)
            .run();
        }

        console.log('[consult] 登録ユーザーの会話履歴を保存しました');
      } else if (guestSessionId) {
        // ゲストユーザーの場合
        // 100件制限チェックと古いメッセージ削除
        // ⚠️ user_idがguest_sessionsテーブルに存在することを確認（登録ユーザーの履歴を除外）
        const messageCountResult = await env.DB.prepare<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM conversations c
           INNER JOIN guest_sessions gs ON c.user_id = gs.id
           WHERE c.user_id = ? AND c.character_id = ? AND c.is_guest_message = 1`
        )
          .bind(guestSessionId, characterId)
          .first();

        const messageCount = messageCountResult?.count || 0;

        if (messageCount >= 100) {
          const deleteCount = messageCount - 100 + 2;
          // ⚠️ user_idがguest_sessionsテーブルに存在することを確認（登録ユーザーの履歴を除外）
          await env.DB.prepare(
            `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ? AND is_guest_message = 1
             AND user_id IN (SELECT id FROM guest_sessions WHERE id = ?)
             AND id IN (
               SELECT c.id FROM conversations c
               INNER JOIN guest_sessions gs ON c.user_id = gs.id
               WHERE c.user_id = ? AND c.character_id = ? AND c.is_guest_message = 1
               ORDER BY COALESCE(c.timestamp, c.created_at) ASC
               LIMIT ?
             )`
          )
            .bind(guestSessionId, characterId, guestSessionId, guestSessionId, characterId, deleteCount)
            .run();
        }

        // ユーザーメッセージを保存
        try {
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
             VALUES (?, ?, 'user', ?, 'normal', 1, CURRENT_TIMESTAMP)`
          )
            .bind(guestSessionId, characterId, trimmedMessage)
            .run();
        } catch {
          // timestampカラムが存在しない場合はcreated_atのみを使用
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
             VALUES (?, ?, 'user', ?, 'normal', 1, CURRENT_TIMESTAMP)`
          )
            .bind(guestSessionId, characterId, trimmedMessage)
            .run();
        }

        // アシスタントメッセージを保存
        try {
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, timestamp)
             VALUES (?, ?, 'assistant', ?, 'normal', 1, CURRENT_TIMESTAMP)`
          )
            .bind(guestSessionId, characterId, responseMessage)
            .run();
        } catch {
          // timestampカラムが存在しない場合はcreated_atのみを使用
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, content, message_type, is_guest_message, created_at)
             VALUES (?, ?, 'assistant', ?, 'normal', 1, CURRENT_TIMESTAMP)`
          )
            .bind(guestSessionId, characterId, responseMessage)
            .run();
        }

        console.log('[consult] ゲストユーザーの会話履歴を保存しました:', {
          guestSessionId,
          characterId,
        });
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
        guestMode: !user,
        remainingGuestMessages: user
          ? undefined
          : Math.max(0, GUEST_MESSAGE_LIMIT - (sanitizedGuestCount + 1)),
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
