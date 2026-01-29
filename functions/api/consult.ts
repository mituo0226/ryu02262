// Cloudflare Pages Functions の型定義
import { generateSystemPrompt, getCharacterName } from '../_lib/character-system.js';
import { isValidCharacter } from '../_lib/character-loader.js';
import { generateGuardianFirstMessagePrompt, generateKaedeFollowUpPrompt } from '../_lib/characters/kaede.js';
import {
  generateKaedePromptOptimized,
  generateGuardianFirstMessagePromptOptimized,
  generateKaedeFollowUpPromptOptimized
} from '../_lib/characters/kaede-optimized.js';
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';
import { getHealthChecker } from '../_lib/api-health-checker.js';

// ===== 定数 =====
const MAX_DEEPSEEK_RETRIES = 3;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';
const MAX_NORMAL_MESSAGES = 10; // 通常保存する最新メッセージ数
const MAX_SUMMARY_COUNT = 10; // 保持する要約の最大数
const MAX_TOTAL_MESSAGES = 20; // 全体の最大メッセージ数（通常10件 + 要約10件）
const MESSAGES_PER_SUMMARY = 10; // 1つの要約に圧縮するメッセージ数
const CACHE_TTL = 300; // キャッシュの有効期限（5分間、秒単位）
const API_TIMEOUT = 15000; // API呼び出しのタイムアウト（15秒）

// ===== 型定義 =====
type ConversationRole = 'user' | 'assistant';

interface ClientHistoryEntry {
  role: ConversationRole;
  content: string;
}

interface RequestBody {
  message: string;
  character?: string;
  clientHistory?: ClientHistoryEntry[];
  migrateHistory?: boolean;
  ritualStart?: boolean; // 守護神の儀式開始通知フラグ
  guardianFirstMessage?: boolean; // 守護神からの最初のメッセージ生成フラグ
  kaedeFollowUp?: boolean; // 楓からの追加メッセージ生成フラグ（guardianFirstMessageの後に呼ばれる）
  guardianName?: string; // 守護神の名前（guardianFirstMessageまたはkaedeFollowUpがtrueの場合に必要）
  guardianMessage?: string; // 守護神からのメッセージ（kaedeFollowUpがtrueの場合に必要）
  firstQuestion?: string | null; // ユーザーの最初の質問
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

// ===== 会話履歴管理 =====

/**
 * 会話履歴を取得（共通関数、キャッシュ対応）
 */
async function getConversationHistory(
  db: D1Database,
  userId: number,
  characterId: string,
  cache?: KVNamespace
): Promise<ClientHistoryEntry[]> {
  // キャッシュキーの生成
  const cacheKey = `chat_history:${userId}:${characterId}`;
  
  // ステップ1: キャッシュから履歴取得を試みる
  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsedHistory = JSON.parse(cached) as ClientHistoryEntry[];
        console.log('[getConversationHistory] キャッシュヒット:', cacheKey);
        return parsedHistory;
      }
    } catch (error) {
      console.log('[getConversationHistory] キャッシュ読み込みエラー:', error);
      // キャッシュエラーは無視して続行
    }
  }
  
  // ステップ2: キャッシュミスの場合、DBから取得
  console.log('[getConversationHistory] キャッシュミス、DBから取得:', cacheKey);
  const historyResults = await db.prepare<ConversationRow & { message_type?: string }>(
    `SELECT c.role, c.message as content, c.is_guest_message, c.message_type
     FROM conversations c
     WHERE c.user_id = ? AND c.character_id = ?
     ORDER BY COALESCE(c.timestamp, c.created_at) DESC
     LIMIT 20`
  )
    .bind(userId, characterId)
    .all();

  // 要約メッセージを通常のメッセージとして扱う（message_type='summary'も含める）
  const history = historyResults.results?.slice().reverse().map((row) => ({
    role: row.role,
    content: row.content || row.message || '',
  })) ?? [];
  
  // ステップ3: キャッシュに保存
  if (cache) {
    try {
      await cache.put(
        cacheKey,
        JSON.stringify(history),
        { expirationTtl: CACHE_TTL }
      );
      console.log('[getConversationHistory] キャッシュに保存しました:', cacheKey);
    } catch (error) {
      console.log('[getConversationHistory] キャッシュ書き込みエラー:', error);
      // キャッシュエラーは無視して続行
    }
  }
  
  return history;
}

/**
 * 会話履歴をキャッシュに更新
 */
async function updateConversationHistoryCache(
  cache: KVNamespace | undefined,
  userId: number,
  characterId: string,
  history: ClientHistoryEntry[]
): Promise<void> {
  if (!cache) {
    return;
  }
  
  const cacheKey = `chat_history:${userId}:${characterId}`;
  
  try {
    await cache.put(
      cacheKey,
      JSON.stringify(history),
      { expirationTtl: CACHE_TTL }
    );
    console.log('[updateConversationHistoryCache] キャッシュを更新しました:', cacheKey);
  } catch (error) {
    console.log('[updateConversationHistoryCache] キャッシュ更新エラー:', error);
    // キャッシュエラーは無視して続行
  }
}

/**
 * 会話履歴を要約して圧縮する
 */
async function summarizeConversationHistory(
  db: D1Database,
  userId: number,
  characterId: string,
  messages: Array<{ role: string; message: string }>,
  env: { DEEPSEEK_API_KEY?: string; 'GPT-API'?: string; OPENAI_API_KEY?: string; FALLBACK_OPENAI_API_KEY?: string; OPENAI_MODEL?: string; FALLBACK_OPENAI_MODEL?: string }
): Promise<string> {
  // メッセージをテキストに変換
  const conversationText = messages
    .map((msg) => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.message}`)
    .join('\n');

  const systemPrompt = `以下の会話履歴を簡潔に要約してください。重要なポイントや相談内容の要点を200文字以内でまとめてください。

会話履歴:
${conversationText}

要約:`;

  const apiKey = env?.DEEPSEEK_API_KEY;
  const fallbackApiKey = env?.['GPT-API'] || env?.OPENAI_API_KEY || env?.FALLBACK_OPENAI_API_KEY;
  const fallbackModel = env?.OPENAI_MODEL || env?.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

  // APIキーが設定されていない場合は、フォールバック処理に進む
  if (!apiKey && !fallbackApiKey) {
    console.warn('[summarizeConversationHistory] APIキーが設定されていません。フォールバック処理を使用します。');
    // フォールバック処理に進む（下記のコードで処理される）
  } else {
    try {
      const llmResult = await getLLMResponse({
        systemPrompt,
        conversationHistory: [],
        userMessage: '上記の会話履歴を要約してください。',
        temperature: 0.3,
        maxTokens: 300,
        topP: 0.8,
        deepseekApiKey: apiKey || '',
        fallbackApiKey: fallbackApiKey,
        fallbackModel: fallbackModel,
      });

      if (llmResult.success && llmResult.message) {
        return llmResult.message;
      }
    } catch (error) {
      console.error('[summarizeConversationHistory] 要約生成エラー:', error);
      // エラーが発生した場合、フォールバック処理に進む
    }
  }

  // フォールバック: 最初と最後のメッセージを簡潔にまとめる
  const firstUserMsg = messages.find((m) => m.role === 'user')?.message || '';
  const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.message || '';
  return `過去の会話: ${firstUserMsg.substring(0, 50)}... ${lastUserMsg.substring(0, 50)}...`;
}

/**
 * 20件制限チェックと古いメッセージの要約圧縮（共通関数）
 * 最初の10件は通常保存、10件以降は10件ずつ要約して1件に圧縮
 */
async function checkAndCleanupOldMessages(
  db: D1Database,
  userId: number,
  characterId: string,
  env?: { DEEPSEEK_API_KEY?: string; 'GPT-API'?: string; OPENAI_API_KEY?: string; FALLBACK_OPENAI_API_KEY?: string; OPENAI_MODEL?: string; FALLBACK_OPENAI_MODEL?: string }
): Promise<void> {
  // 現在のメッセージ数を取得
  const messageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ?`
  )
    .bind(userId, characterId)
    .first();

  const messageCount = messageCountResult?.count || 0;

  // 通常メッセージ数（要約以外）を取得
  const normalMessageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ? AND message_type != 'summary'`
  )
    .bind(userId, characterId)
    .first();

  const normalMessageCount = normalMessageCountResult?.count || 0;

  // 要約メッセージ数を取得
  const summaryCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ? AND message_type = 'summary'`
  )
    .bind(userId, characterId)
    .first();

  const summaryCount = summaryCountResult?.count || 0;

  // 要約メッセージが10件を超えた場合、古い要約メッセージを削除
  if (summaryCount > MAX_SUMMARY_COUNT) {
    const deleteSummaryCount = summaryCount - MAX_SUMMARY_COUNT;
    await db.prepare(
      `DELETE FROM conversations
       WHERE user_id = ? AND character_id = ? AND message_type = 'summary'
       AND id IN (
         SELECT id FROM conversations
         WHERE user_id = ? AND character_id = ? AND message_type = 'summary'
         ORDER BY COALESCE(timestamp, created_at) ASC
         LIMIT ?
       )`
    )
      .bind(userId, characterId, userId, characterId, deleteSummaryCount)
      .run();

    console.log('[checkAndCleanupOldMessages] 古い要約メッセージを削除しました:', {
      userId,
      characterId,
      deleteSummaryCount,
    });
  }

  // 通常メッセージが10件を超えた場合、古い10件を要約して圧縮
  if (normalMessageCount > MAX_NORMAL_MESSAGES && env && summaryCount < MAX_SUMMARY_COUNT) {
    // 要約する古い10件を取得（要約以外のメッセージから、最も古い10件）
    const oldMessagesResult = await db.prepare<{
      id: number;
      role: string;
      message: string;
    }>(
      `SELECT id, role, message
       FROM conversations
       WHERE user_id = ? AND character_id = ? AND message_type != 'summary'
       ORDER BY COALESCE(timestamp, created_at) ASC
       LIMIT ?`
    )
      .bind(userId, characterId, MESSAGES_PER_SUMMARY)
      .all();

    const oldMessages = oldMessagesResult.results || [];

    if (oldMessages.length >= MESSAGES_PER_SUMMARY) {
      // 要約を生成
      const summary = await summarizeConversationHistory(
        db,
        userId,
        characterId,
        oldMessages.map((m) => ({ role: m.role, message: m.message || '' })),
        env
      );

      // 要約メッセージを保存
      try {
        await db.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'assistant', ?, 'summary', 0, CURRENT_TIMESTAMP)`
        )
          .bind(userId, characterId, summary)
          .run();
      } catch {
        await db.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'assistant', ?, 'summary', 0, CURRENT_TIMESTAMP)`
        )
          .bind(userId, characterId, summary)
          .run();
      }

      // 元の10件を削除
      const idsToDelete = oldMessages.map((m) => m.id);
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(',');
        await db.prepare(
          `DELETE FROM conversations
           WHERE user_id = ? AND character_id = ? AND id IN (${placeholders})`
        )
          .bind(userId, characterId, ...idsToDelete)
          .run();
      }

      console.log('[checkAndCleanupOldMessages] 10件のメッセージを要約して1件に圧縮しました:', {
        userId,
        characterId,
        compressedCount: oldMessages.length,
      });
    }
  }

  // 全体が20件を超えた場合、古いメッセージ（要約も含む）を削除
  // これにより、通常メッセージ10件 + 要約メッセージ10件 = 合計20件を維持
  if (messageCount >= MAX_TOTAL_MESSAGES) {
    const deleteCount = messageCount - MAX_TOTAL_MESSAGES + 1;
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

    console.log('[checkAndCleanupOldMessages] 全体が20件を超えたため、古いメッセージを削除しました:', {
      userId,
      characterId,
      deleteCount,
      remainingCount: messageCount - deleteCount,
    });
  }
}

/**
 * ユーザーメッセージを保存（2段階保存の第1段階）
 * 会話開始時に即座に保存される
 * 【改修】last_updated_atカラムも更新（訪問パターン判定用）
 */
async function saveUserMessage(
  db: D1Database,
  userId: number,
  characterId: string,
  userMessage: string,
  env?: { DEEPSEEK_API_KEY?: string; 'GPT-API'?: string; OPENAI_API_KEY?: string; FALLBACK_OPENAI_API_KEY?: string; OPENAI_MODEL?: string; FALLBACK_OPENAI_MODEL?: string }
): Promise<void> {
  // 20件制限チェックと古いメッセージの要約圧縮
  try {
    await checkAndCleanupOldMessages(db, userId, characterId, env);
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

  // 現在時刻をUTCで取得
  const nowUtc = new Date().toISOString();

  // ユーザーメッセージを保存
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  // 【改修】last_updated_atカラムも同時に更新（訪問パターン判定用）
  try {
    const result = await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp, last_updated_at)
       VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP, ?)`
    )
      .bind(userId, characterId, userMessage, isGuestMessage, nowUtc)
      .run();
    console.log('[saveUserMessage] メッセージを保存しました（last_updated_at更新済み）:', {
      userId,
      characterId,
      messageId: result.meta?.last_row_id,
      lastUpdatedAt: nowUtc,
    });
  } catch (error) {
    console.error('[saveUserMessage] timestampカラムでの保存に失敗、created_atで再試行:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      characterId,
    });
    try {
      // last_updated_atカラムが存在しない場合のフォールバック
      const result = await db.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at, last_updated_at)
         VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP, ?)`
      )
        .bind(userId, characterId, userMessage, isGuestMessage, nowUtc)
        .run();
      console.log('[saveUserMessage] created_atカラムでメッセージを保存しました（last_updated_at更新済み）:', {
        userId,
        characterId,
        messageId: result.meta?.last_row_id,
        lastUpdatedAt: nowUtc,
      });
    } catch (retryError) {
      // last_updated_atカラムが存在しない場合（マイグレーション前）のフォールバック
      try {
        const result = await db.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'user', ?, 'normal', ?, CURRENT_TIMESTAMP)`
        )
          .bind(userId, characterId, userMessage, isGuestMessage)
          .run();
        console.log('[saveUserMessage] created_atカラムでメッセージを保存しました（last_updated_atカラムなし）:', {
          userId,
          characterId,
          messageId: result.meta?.last_row_id,
        });
      } catch (finalError) {
        console.error('[saveUserMessage] メッセージ保存に完全に失敗:', {
          error: finalError instanceof Error ? finalError.message : String(finalError),
          stack: finalError instanceof Error ? finalError.stack : undefined,
          userId,
          characterId,
        });
        throw finalError; // エラーを再スローして呼び出し元で処理できるようにする
      }
    }
  }
}

/**
 * メッセージが重要かどうかを判定
 */
function shouldMarkAsImportant(messageCount: number, content: string, role: string): boolean {
  // アシスタントメッセージのみ判定
  if (role !== 'assistant') {
    return false;
  }
  
  // 最初の10通は重要
  if (messageCount <= 10) {
    return true;
  }
  
  // キーワードベースの判定
  const importantKeywords = [
    '守護神',
    'タロット',
    '生年月日',
    '名前',
    'ニックネーム',
    '相性',
    '運勢',
    '儀式',
  ];
  
  return importantKeywords.some(keyword => content.includes(keyword));
}

/**
 * アシスタントメッセージを保存（2段階保存の第2段階）
 * LLM応答後に保存される
 */
async function saveAssistantMessage(
  db: D1Database,
  userId: number,
  characterId: string,
  assistantMessage: string,
  messageCount?: number
): Promise<void> {
  // is_guest_messageは常に0（使用しない）
  const isGuestMessage = 0;

  // 重要度判定（メッセージ数を取得）
  const assistantMessageCountResult = await db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND character_id = ? AND role = 'assistant'`
  )
    .bind(userId, characterId)
    .first();

  const assistantMessageCount = assistantMessageCountResult?.count || 0;
  const totalMessageCount = messageCount !== undefined ? messageCount : assistantMessageCount + 1;
  const isImportant = shouldMarkAsImportant(totalMessageCount, assistantMessage, 'assistant');

  // 注意: 10件制限チェックと要約圧縮はcheckAndCleanupOldMessagesで行うため、ここでは削除しない

  // アシスタントメッセージを保存（重要度フラグを含む）
  // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
  try {
    const result = await db.prepare(
      `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, is_important, timestamp)
       VALUES (?, ?, 'assistant', ?, 'normal', ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, characterId, assistantMessage, isGuestMessage, isImportant ? 1 : 0)
      .run();
    console.log('[saveAssistantMessage] メッセージを保存しました:', {
      userId,
      characterId,
      messageId: result.meta?.last_row_id,
      isImportant,
    });
  } catch (error) {
    console.error('[saveAssistantMessage] timestampカラムでの保存に失敗、created_atで再試行:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      characterId,
    });
    try {
      const result = await db.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, is_important, created_at)
         VALUES (?, ?, 'assistant', ?, 'normal', ?, ?, CURRENT_TIMESTAMP)`
      )
        .bind(userId, characterId, assistantMessage, isGuestMessage, isImportant ? 1 : 0)
        .run();
      console.log('[saveAssistantMessage] created_atカラムでメッセージを保存しました:', {
        userId,
        characterId,
        messageId: result.meta?.last_row_id,
        isImportant,
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
 * DeepSeek API を呼び出し（リトライ付き、タイムアウト対応）
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          lastError = 'DeepSeek API timeout';
          console.error('DeepSeek API timeout:', { attempt });
        } else {
          const message = fetchError instanceof Error ? fetchError.message : 'Unknown DeepSeek error';
          lastError = message;
          console.error('DeepSeek API fetch error:', { attempt, message });
        }
        if (attempt < MAX_DEEPSEEK_RETRIES) {
          await sleep(300 * attempt * attempt);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown DeepSeek error';
      lastError = message;
      console.error('DeepSeek API error:', { attempt, message });
      if (attempt < MAX_DEEPSEEK_RETRIES) {
        await sleep(300 * attempt * attempt);
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * OpenAI API を呼び出し（フォールバック、タイムアウト対応）
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OpenAI API timeout');
      return { success: false, error: 'OpenAI API timeout' };
    }
    const message = error instanceof Error ? error.message : 'Unknown OpenAI error';
    console.error('OpenAI API fetch error:', { message });
    return { success: false, error: message };
  }
}

/**
 * LLM レスポンスを取得（DeepSeek → OpenAI フォールバック、ヘルスチェッカー対応）
 */
async function getLLMResponse(params: LLMRequestParams): Promise<LLMResponseResult> {
  const healthChecker = getHealthChecker();
  let aiResponse: LLMResponseResult | null = null;
  let usedAPI: 'deepseek' | 'openai' | null = null;

  // APIキーが設定されていない場合はエラーを返す
  if (!params.deepseekApiKey && !params.fallbackApiKey) {
    return {
      success: false,
      error: 'API keys are not configured',
    };
  }

  // DeepSeekを使用すべきか判定（APIキーが設定されている場合のみ）
  if (healthChecker.shouldUseDeepSeek() && params.deepseekApiKey) {
    try {
      console.log('[LLM] Attempting DeepSeek API...');
      aiResponse = await callDeepSeek(params);
      
      if (aiResponse.success) {
        healthChecker.recordDeepSeekSuccess();
        usedAPI = 'deepseek';
        console.log('[LLM] ✅ DeepSeek API から応答を取得しました');
        return aiResponse;
      } else {
        healthChecker.recordDeepSeekFailure();
        console.log('[LLM] ⚠️ DeepSeek API 失敗、OpenAI にフォールバック:', aiResponse.error);
        
        // OpenAIフォールバック
        try {
          console.log('[LLM] Falling back to OpenAI...');
          aiResponse = await callOpenAI(params);
          
          if (aiResponse.success) {
            healthChecker.recordOpenAISuccess();
            usedAPI = 'openai';
            console.log('[LLM] ✅ OpenAI API から応答を取得しました');
            return aiResponse;
          } else {
            healthChecker.recordOpenAIFailure();
            console.error('[LLM] ❌ OpenAI API も失敗しました:', aiResponse.error);
            throw new Error(`Both DeepSeek and OpenAI APIs failed: DeepSeek: ${aiResponse.error}, OpenAI: ${aiResponse.error}`);
          }
        } catch (openaiError) {
          healthChecker.recordOpenAIFailure();
          console.error('[LLM] ❌ OpenAI API 呼び出しエラー:', openaiError);
          throw new Error(`Both DeepSeek and OpenAI APIs failed`);
        }
      }
    } catch (error) {
      healthChecker.recordDeepSeekFailure();
      console.error('[LLM] ❌ DeepSeek API 呼び出しエラー:', error);
      
      // OpenAIフォールバック
      try {
        console.log('[LLM] Falling back to OpenAI after error...');
        aiResponse = await callOpenAI(params);
        
        if (aiResponse.success) {
          healthChecker.recordOpenAISuccess();
          usedAPI = 'openai';
          console.log('[LLM] ✅ OpenAI API から応答を取得しました');
          return aiResponse;
        } else {
          healthChecker.recordOpenAIFailure();
          console.error('[LLM] ❌ OpenAI API も失敗しました');
          throw new Error(`Both DeepSeek and OpenAI APIs failed`);
        }
      } catch (openaiError) {
        healthChecker.recordOpenAIFailure();
        console.error('[LLM] ❌ OpenAI API 呼び出しエラー:', openaiError);
        throw new Error(`Both DeepSeek and OpenAI APIs failed`);
      }
    }
  } else {
    // DeepSeekがクールダウン中、直接OpenAIを使用
    try {
      console.log('[LLM] Using OpenAI (DeepSeek in cooldown)...');
      aiResponse = await callOpenAI(params);
      
      if (aiResponse.success) {
        healthChecker.recordOpenAISuccess();
        usedAPI = 'openai';
        console.log('[LLM] ✅ OpenAI API から応答を取得しました');
        return aiResponse;
      } else {
        healthChecker.recordOpenAIFailure();
        console.error('[LLM] ❌ OpenAI API 失敗:', aiResponse.error);
        throw new Error(`OpenAI API failed: ${aiResponse.error}`);
      }
    } catch (error) {
      healthChecker.recordOpenAIFailure();
      console.error('[LLM] ❌ OpenAI API 呼び出しエラー:', error);
      throw new Error(`OpenAI API failed`);
    }
  }
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

    // ===== 6. 会話履歴の取得（キャッシュ対応）=====
    const sanitizedHistory = sanitizeClientHistory(body.clientHistory);
    let conversationHistory: ClientHistoryEntry[] = [];
    let dbHistoryOnly: ClientHistoryEntry[] = []; // データベースから取得した履歴のみ（hasPreviousConversation判定用）

    // ===== ユーザーの履歴取得（キャッシュ対応）=====
    if (user) {
      try {
        // CHAT_CACHEが設定されている場合はキャッシュを使用
        const cache = env.CHAT_CACHE as KVNamespace | undefined;
        const dbHistory = await getConversationHistory(env.DB, user.id, characterId, cache);
        dbHistoryOnly = dbHistory; // データベース履歴を保存
        conversationHistory = dbHistory;
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
    // 【新仕様】すべてのユーザーを登録ユーザーとして扱うため、ゲストメッセージの処理は不要

    // ===== 11. 守護神からの最初のメッセージ生成処理 =====
    const isGuardianFirstMessage = body.guardianFirstMessage === true;
    if (isGuardianFirstMessage && characterId === 'kaede' && user?.guardian) {
      try {
        const guardianName = body.guardianName || user.guardian;
        const userNickname = user?.nickname || 'あなた';
        const firstQuestion = body.firstQuestion || null;

        console.log('[consult] 守護神からの最初のメッセージを生成します:', {
          guardianName,
          userNickname,
          hasFirstQuestion: !!firstQuestion,
        });

        // 守護神専用のシステムプロンプトを生成（最適化版）
        const guardianSystemPrompt = generateGuardianFirstMessagePromptOptimized(
          guardianName,
          userNickname
        );

        // 会話履歴は空（守護神の最初のメッセージのため）
        const guardianConversationHistory: ClientHistoryEntry[] = [];

        // LLMにリクエストを送信
        const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
        const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
        const guardianLLMResult = await getLLMResponse({
          systemPrompt: guardianSystemPrompt,
          conversationHistory: guardianConversationHistory,
          userMessage: `${userNickname}さん、守護神の儀式が完了しました。${userNickname}さんに最初のメッセージを送ってください。`,
          temperature: 0.8, // 創造性を少し高める
          maxTokens: 500,
          topP: 0.9,
          deepseekApiKey: apiKey,
          fallbackApiKey: fallbackApiKey,
          fallbackModel: fallbackModel,
        });

        if (guardianLLMResult.success && guardianLLMResult.message) {
          console.log('[consult] ✅ 守護神からの最初のメッセージを生成しました');

          // 生成されたメッセージを会話履歴に保存
          // 守護神メッセージは重要（最初のメッセージのため）
          if (user) {
            await saveAssistantMessage(env.DB, user.id, characterId, guardianLLMResult.message, 1);
          }

          return new Response(
            JSON.stringify({
              message: guardianLLMResult.message,
              character: characterId,
              characterName: getCharacterName(characterId),
              isInappropriate: false,
              detectedKeywords: [],
              provider: guardianLLMResult.provider,
              clearChat: false,
            } as ResponseBody),
            { status: 200, headers: corsHeaders }
          );
        } else {
          console.error('[consult] ❌ 守護神メッセージ生成エラー:', guardianLLMResult.error);
          // エラーの場合、フォールバックメッセージを返す
          const fallbackMessage = `${userNickname}さん、私は${guardianName}。あなたを、前世からずっと守り続けてきました。今、${userNickname}さんの心の奥底には、何か感じるものがありますね。${userNickname}さんは今、何を求めていますか？私と共に、あなたの魂が本当に望むものを、一緒に見つけていきましょう。`;
          
          // フォールバックメッセージも重要（守護神メッセージのため）
          if (user) {
            await saveAssistantMessage(env.DB, user.id, characterId, fallbackMessage, 1);
          }

          return new Response(
            JSON.stringify({
              message: fallbackMessage,
              character: characterId,
              characterName: getCharacterName(characterId),
              isInappropriate: false,
              detectedKeywords: [],
              clearChat: false,
            } as ResponseBody),
            { status: 200, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error('[consult] ❌ 守護神メッセージ生成処理エラー:', {
          error: error instanceof Error ? error.message : String(error),
        });
        // エラーが発生した場合、通常の処理にフォールバック
      }
    }

    // ===== 12. 楓からの追加メッセージ生成処理（守護神のメッセージの後）=====
    const isKaedeFollowUp = body.kaedeFollowUp === true;
    if (isKaedeFollowUp && characterId === 'kaede' && body.guardianName && body.guardianMessage) {
      try {
        const guardianName = body.guardianName;
        const guardianMessage = body.guardianMessage;
        const userNickname = user?.nickname || 'あなた';
        const firstQuestion = body.firstQuestion || null;

        // 【重要】データベースから守護神情報を再取得して確認
        // guardian-ritual.htmlで保存された守護神がデータベースに反映されているか確認
        let dbGuardian = user?.guardian;
        if (user && (!dbGuardian || dbGuardian.trim() === '')) {
          // データベースから再取得を試みる（guardian-ritual.htmlで保存された可能性があるため）
          const refreshedUser = await env.DB.prepare<{ guardian: string | null }>(
            'SELECT guardian FROM users WHERE id = ?'
          )
            .bind(user.id)
            .first();
          
          if (refreshedUser && refreshedUser.guardian && refreshedUser.guardian.trim() !== '') {
            dbGuardian = refreshedUser.guardian;
            // userオブジェクトも更新
            user.guardian = dbGuardian;
            console.log('[consult] データベースから守護神情報を再取得しました:', dbGuardian);
          }
        }

        console.log('[consult] 楓からの追加メッセージを生成します（守護神のメッセージの後）:', {
          guardianName,
          dbGuardian,
          userNickname,
          hasGuardianMessage: !!guardianMessage,
          hasFirstQuestion: !!firstQuestion,
          guardianMatches: guardianName === dbGuardian,
        });

        // 楓専用のシステムプロンプトを生成（最適化版）
        const kaedeSystemPrompt = generateKaedeFollowUpPromptOptimized(
          guardianName,
          guardianMessage,
          userNickname
        );

        // 会話履歴は空（楓の最初のメッセージのため）
        const kaedeConversationHistory: ClientHistoryEntry[] = [];

        // LLMにリクエストを送信
        const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
        const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
        const kaedeLLMResult = await getLLMResponse({
          systemPrompt: kaedeSystemPrompt,
          conversationHistory: kaedeConversationHistory,
          userMessage: `守護神${guardianName}のメッセージを聞いた後、楓として${userNickname}さんに語りかけてください。`,
          temperature: 0.8,
          maxTokens: 2800,
          topP: 0.9,
          deepseekApiKey: apiKey,
          fallbackApiKey: fallbackApiKey,
          fallbackModel: fallbackModel,
        });

        if (kaedeLLMResult.success && kaedeLLMResult.message) {
          console.log('[consult] ✅ 楓からの追加メッセージを生成しました');

          // 生成されたメッセージを会話履歴に保存
          // 楓のフォローアップメッセージも重要（守護神メッセージの直後）
          if (user) {
            await saveAssistantMessage(env.DB, user.id, characterId, kaedeLLMResult.message, 2);
          }

          return new Response(
            JSON.stringify({
              message: kaedeLLMResult.message,
              character: characterId,
              characterName: getCharacterName(characterId),
              isInappropriate: false,
              detectedKeywords: [],
              provider: kaedeLLMResult.provider,
              clearChat: false,
            } as ResponseBody),
            { status: 200, headers: corsHeaders }
          );
        } else {
          console.error('[consult] ❌ 楓メッセージ生成エラー:', {
            error: kaedeLLMResult.error,
            guardianName,
            userNickname,
            hasGuardianMessage: !!guardianMessage,
          });
          
          // エラーの場合、適切なエラーレスポンスを返す（通常の処理にフォールバックしない）
          return new Response(
            JSON.stringify({
              error: kaedeLLMResult.error || '楓メッセージの生成に失敗しました',
              message: '',
              character: characterId,
              characterName: getCharacterName(characterId),
              isInappropriate: false,
              detectedKeywords: [],
            } as ResponseBody),
            { status: 500, headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error('[consult] ❌ 楓メッセージ生成処理エラー:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          guardianName: body.guardianName,
          userNickname: user?.nickname,
        });
        
        // エラーが発生した場合、適切なエラーレスポンスを返す（通常の処理にフォールバックしない）
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : '楓メッセージの生成処理でエラーが発生しました',
            message: '',
            character: characterId,
            characterName: getCharacterName(characterId),
            isInappropriate: false,
            detectedKeywords: [],
          } as ResponseBody),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ===== 13. システムプロンプトの生成 =====
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
    
    // 【全キャラクター統一】訪問パターンを判定
    let visitPatternInfo: any = null;
    if (user) {
      try {
        // ユーザーが登録済みかどうかを判定（nicknameが存在するか）
        const isRegisteredUser = !!user.nickname;
        
        visitPatternInfo = await detectVisitPattern({
          userId: user.id,
          characterId: characterId,
          database: env.DB,
          isRegisteredUser: isRegisteredUser,
        });
        console.log(`[consult] ${characterId}の訪問パターン判定完了:`, visitPatternInfo.pattern);
      } catch (error) {
        console.error('[consult] 訪問パターン判定エラー:', error);
        // エラー時は初回訪問として扱う
        visitPatternInfo = {
          pattern: 'first_visit',
          conversationHistory: [],
          sessionContext: null,
          lastConversationSummary: null,
        };
      }
    }
    
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
    
    // ===== 楓の最適化版プロンプトを使用するか判定 =====
    let systemPrompt: string;
    let maxTokensForCharacter = 2000;

    if (characterId === 'kaede' && user?.guardian) {
      // 楓で守護神が決定している場合は最適化版を使用
      systemPrompt = generateKaedePromptOptimized({
        userNickname: user?.nickname || 'あなた',
        guardian: user?.guardian,
        visitPattern: visitPatternInfo?.pattern || 'first_visit',
        lastSummary: visitPatternInfo?.lastConversationSummary || null,
        userMessageCount: userMessageCount,
      });
      maxTokensForCharacter = 2800;
      console.log('[consult] 楓（最適化版）のプロンプトを使用', {
        userNickname: user?.nickname,
        guardian: user?.guardian,
        maxTokens: maxTokensForCharacter,
      });
    } else {
      // その他のキャラは従来版を使用
      systemPrompt = generateSystemPrompt(characterId, {
        userNickname: user?.nickname,
        hasPreviousConversation: hasPreviousConversation,
        // 各キャラクターの性格設定に必要な情報のみ
        guardian: user?.guardian || null,
        isRitualStart: isRitualStart,
        isJustRegistered: isJustRegistered,
        userMessageCount: userMessageCount,
        userGender: userGender,
        userBirthDate: userBirthDate,
        // 三崎花音の動的プロンプト生成用パラメータ
        visitPattern: visitPatternInfo?.pattern || 'first_visit',
        conversationHistory: visitPatternInfo?.conversationHistory || [],
        lastConversationSummary: visitPatternInfo?.lastConversationSummary || null,
        sessionContext: visitPatternInfo?.sessionContext || null,
      });
      console.log('[consult] 従来版のプロンプトを使用', { characterId });
    }

    console.log('[consult] システムプロンプト生成:', {
      characterId,
      userNickname: user?.nickname,
      guardian: user?.guardian,
      userMessageCount,
      isRitualStart,
      userGender,
      userBirthDate,
      visitPattern: visitPatternInfo?.pattern,
      lastConversationSummary: visitPatternInfo?.lastConversationSummary 
        ? (typeof visitPatternInfo.lastConversationSummary === 'object'
          ? `${visitPatternInfo.lastConversationSummary.date || ''}: ${visitPatternInfo.lastConversationSummary.topics || ''}`.substring(0, 100)
          : visitPatternInfo.lastConversationSummary.substring(0, 100))
        : null,
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 500) + '...',
    });

    // ===== 10. ユーザーメッセージの保存（2段階保存の第1段階）=====
    // 会話開始時に即座にユーザーメッセージを保存（LLM応答前）
    if (!shouldClearChat && !isJustRegistered) {
      try {
        // 【新仕様】すべてのユーザーを'registered'として扱う
        if (user) {
          await saveUserMessage(env.DB, user.id, characterId, trimmedMessage, env);
          console.log('[consult] ユーザーのメッセージを保存しました:', {
            userId: user.id,
            characterId,
          });
          
          // キャッシュを更新（ユーザーメッセージを追加）
          const updatedHistory: ClientHistoryEntry[] = [
            ...conversationHistory,
            { role: 'user', content: trimmedMessage },
          ];
          
          const cache = env.CHAT_CACHE as KVNamespace | undefined;
          await updateConversationHistoryCache(cache, user.id, characterId, updatedHistory);
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

    // 楓と三崎花音の完全版プロンプトは長いため、maxTokensを増やす
    // 雪乃も長い返答を生成することが多いため、maxTokensを増やす
    const maxTokensForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 2000 : 
                                   (characterId === 'yukino') ? 1500 : 800;
    const temperatureForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.7 : 0.5; // 楓と三崎花音では少し高い温度で温かみを出す
    const topPForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.9 : 0.8;
    
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

    // ===== 14. タロットカード検出（笹岡雪乃の場合のみ）=====
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
          await saveAssistantMessage(env.DB, user.id, characterId, responseMessage, userMessageCount);
          console.log('[consult] アシスタントメッセージを保存しました:', {
            userId: user.id,
            characterId,
            userMessageCount,
          });
          
          // キャッシュを更新（新しいメッセージを追加）
          const updatedHistory: ClientHistoryEntry[] = [
            ...conversationHistory,
            { role: 'user', content: trimmedMessage },
            { role: 'assistant', content: responseMessage },
          ];
          
          const cache = env.CHAT_CACHE as KVNamespace | undefined;
          await updateConversationHistoryCache(cache, user.id, characterId, updatedHistory);
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
