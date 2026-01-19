// Cloudflare Pages Functions の型定義
import { generateSystemPrompt } from '../_lib/character-system.js';
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';

interface ConversationRow {
  role: 'user' | 'assistant';
  message?: string; // データベースの実際のカラム名
  content?: string; // SQLクエリでmessage as contentとしてエイリアスされた値
  created_at: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  guardian: string;
}

interface ResponseBody {
  hasHistory: boolean;
  hasOtherCharacterHistory?: boolean; // 他のキャラクターとの会話履歴があるかどうか
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string;
  lastConversationDate?: string; // 最後の会話日時（ISO形式）
  conversationSummary?: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
  }>;
  error?: string;
  clearChat?: boolean; // チャットクリア指示フラグ（APIからの指示）
  firstQuestion?: string; // 最初の質問（儀式完了後の定型文で使用）
  welcomeMessage?: string | null; // 初回訪問時のウェルカムメッセージ（新規追加）
  returningMessage?: string | null; // 再訪問時のメッセージ（新規追加）
  visitPattern?: string; // 訪問パターン（新規追加）
  requireGuardianConsent?: boolean; // 楓専用: 守護神の儀式同意が必要かどうか（新規追加）
}

// ===== 定数 =====
const MAX_DEEPSEEK_RETRIES = 3;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';

// ===== 型定義 =====
interface ClientHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
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

interface LLMResponseResult {
  success: boolean;
  message?: string;
  provider?: 'deepseek' | 'openai';
  rawResponse?: unknown;
  error?: string;
  status?: number;
}

// ===== ユーティリティ関数 =====

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
  console.log('[conversation-history] DeepSeek API を呼び出します...');
  const deepseekResult = await callDeepSeek(params);

  if (deepseekResult.success) {
    console.log('[conversation-history] ✅ DeepSeek API から応答を取得しました');
    return deepseekResult;
  }

  console.log('[conversation-history] ⚠️ DeepSeek API 失敗、OpenAI にフォールバック:', deepseekResult.error);
  const openaiResult = await callOpenAI(params);

  if (openaiResult.success) {
    console.log('[conversation-history] ✅ OpenAI API から応答を取得しました');
    return openaiResult;
  }

  console.error('[conversation-history] ❌ 両方の API が失敗しました');
  return {
    success: false,
    error: `DeepSeek: ${deepseekResult.error}, OpenAI: ${openaiResult.error}`,
    status: openaiResult.status,
  };
}

/**
 * フォールバックウェルカムメッセージを取得
 */
function getFallbackWelcomeMessage(characterId: string): string {
  const fallbacks: Record<string, string> = {
    kaede: 'ようこそ、楓の神社へ...',
    yukino: 'いらっしゃいませ...',
    sora: 'こんにちは...',
    kaon: 'お待ちしておりました...',
  };
  return fallbacks[characterId] || 'ようこそ、いらっしゃいませ。';
}

/**
 * フォールバック再訪問メッセージを取得
 */
function getFallbackReturningMessage(characterId: string): string {
  const fallbacks: Record<string, string> = {
    kaede: 'また会いに来てくれてありがとうございます。',
    yukino: 'おかえりなさい。',
    sora: 'また会えて嬉しいです。',
    kaon: 'また会いに来てくれたのね...',
  };
  return fallbacks[characterId] || 'また会いに来てくれてありがとうございます。';
}

/**
 * 再訪問メッセージを生成
 */
async function generateReturningMessage({
  characterId,
  user,
  conversationHistory,
  lastUserMessage,
  env,
}: {
  characterId: string;
  user: UserRecord;
  conversationHistory: ClientHistoryEntry[];
  lastUserMessage: string | null;
  env: any;
}): Promise<string | null> {
  try {
    // 訪問パターン判定
    const visitPatternInfo = await detectVisitPattern({
      userId: user.id,
      characterId: characterId,
      database: env.DB,
      isRegisteredUser: !!user.nickname,
    });

    // ユーザー情報を取得
    let userGender: string | null = null;
    let userBirthDate: string | null = null;
    
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
      console.error('[conversation-history] ユーザー情報取得エラー:', error);
    }

    // システムプロンプト生成（再訪問時）
    const systemPrompt = generateSystemPrompt(characterId, {
      userNickname: user.nickname,
      hasPreviousConversation: true,
      guardian: user.guardian || null,
      isRitualStart: false,
      isJustRegistered: false,
      userMessageCount: conversationHistory.filter(m => m.role === 'user').length,
      userGender: userGender,
      userBirthDate: userBirthDate,
      visitPattern: visitPatternInfo?.pattern || 'returning',
      conversationHistory: visitPatternInfo?.conversationHistory || conversationHistory,
      lastConversationSummary: visitPatternInfo?.lastConversationSummary || null,
      sessionContext: visitPatternInfo?.sessionContext || null,
    });

    // LLM API呼び出し
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[conversation-history] DEEPSEEK_API_KEYが設定されていません');
      return null;
    }

    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    // キャラクターに応じたパラメータ設定
    const maxTokensForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 2000 : 800;
    const temperatureForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.7 : 0.5;
    const topPForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.9 : 0.8;

    // 最後のユーザーメッセージを使用（なければデフォルトメッセージ）
    const userMessage = lastUserMessage || 'また会いに来ました。';
    
    // 会話履歴を準備（最後の数件のみ）
    const recentHistory = conversationHistory.slice(-6);

    const llmResult = await getLLMResponse({
      systemPrompt,
      conversationHistory: recentHistory,
      userMessage,
      temperature: temperatureForCharacter,
      maxTokens: maxTokensForCharacter,
      topP: topPForCharacter,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (llmResult.success && llmResult.message) {
      console.log('[conversation-history] ✅ returningMessageを生成しました');
      return llmResult.message;
    } else {
      console.error('[conversation-history] ❌ returningMessage生成に失敗:', llmResult.error);
      // フォールバックメッセージを返す
      return getFallbackReturningMessage(characterId);
    }
  } catch (error) {
    console.error('[conversation-history] returningMessage生成エラー:', error);
    // エラー時もフォールバックメッセージを返す
    return getFallbackReturningMessage(characterId);
  }
}

/**
 * 初回メッセージを生成
 */
async function generateWelcomeMessage({
  characterId,
  user,
  env,
}: {
  characterId: string;
  user: UserRecord;
  env: any;
}): Promise<string | null> {
  try {
    // 訪問パターン判定
    const visitPatternInfo = await detectVisitPattern({
      userId: user.id,
      characterId: characterId,
      database: env.DB,
      isRegisteredUser: !!user.nickname,
    });

    // ユーザー情報を取得
    let userGender: string | null = null;
    let userBirthDate: string | null = null;
    
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
      console.error('[conversation-history] ユーザー情報取得エラー:', error);
    }

    // システムプロンプト生成
    const systemPrompt = generateSystemPrompt(characterId, {
      userNickname: user.nickname,
      hasPreviousConversation: false,
      guardian: user.guardian || null,
      isRitualStart: false,
      isJustRegistered: false,
      userMessageCount: 0,
      userGender: userGender,
      userBirthDate: userBirthDate,
      visitPattern: visitPatternInfo?.pattern || 'first_visit',
      conversationHistory: visitPatternInfo?.conversationHistory || [],
      lastConversationSummary: visitPatternInfo?.lastConversationSummary || null,
      sessionContext: visitPatternInfo?.sessionContext || null,
    });

    // LLM API呼び出し
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[conversation-history] DEEPSEEK_API_KEYが設定されていません');
      // APIキーがない場合もフォールバックメッセージを返す
      return getFallbackWelcomeMessage(characterId);
    }

    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    // キャラクターに応じたパラメータ設定
    const maxTokensForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 2000 : 800;
    const temperatureForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.7 : 0.5;
    const topPForCharacter = (characterId === 'kaede' || characterId === 'kaon') ? 0.9 : 0.8;

    const userMessage = '初めてお会いします。よろしくお願いします。';
    const conversationHistory: ClientHistoryEntry[] = [];

    const llmResult = await getLLMResponse({
      systemPrompt,
      conversationHistory,
      userMessage,
      temperature: temperatureForCharacter,
      maxTokens: maxTokensForCharacter,
      topP: topPForCharacter,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (llmResult.success && llmResult.message) {
      console.log('[conversation-history] ✅ welcomeMessageを生成しました');
      return llmResult.message;
    } else {
      console.error('[conversation-history] ❌ welcomeMessage生成に失敗:', llmResult.error);
      // フォールバックメッセージを返す
      return getFallbackWelcomeMessage(characterId);
    }
  } catch (error) {
    console.error('[conversation-history] welcomeMessage生成エラー:', error);
    // エラー時もフォールバックメッセージを返す
    return getFallbackWelcomeMessage(characterId);
  }
}

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const nickname = url.searchParams.get('nickname');
    const birthYear = url.searchParams.get('birthYear');
    const birthMonth = url.searchParams.get('birthMonth');
    const birthDay = url.searchParams.get('birthDay');
    const characterId = url.searchParams.get('character') || 'kaede';

    let user: UserRecord | null = null;

    // 【変更】user_idを優先的に使用（より安全で効率的）
    if (userIdParam) {
      const userId = Number(userIdParam);
      if (Number.isFinite(userId) && userId > 0) {
        user = await env.DB.prepare<UserRecord>(
          'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?'
        )
          .bind(userId)
          .first();
      }
    }

    // user_idで取得できない場合、nickname + 生年月日で取得（後方互換性のため）
    if (!user && nickname && birthYear && birthMonth && birthDay) {
      user = await env.DB.prepare<UserRecord>(
        'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
      )
        .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
        .first();
    }

    if (!user) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: userIdParam ? 'user not found (invalid userId)' : 'nickname and birth date are required',
        } as ResponseBody),
        {
          status: userIdParam ? 404 : 400,
          headers: corsHeaders,
        }
      );
    }

    // ===== ユーザーの会話履歴取得 =====
    // 【重要】実際のデータベースにはmessageカラムが存在し、contentカラムは存在しない
    // したがって、messageカラムのみを使用する
    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT c.role, c.message as content, c.message, COALESCE(c.timestamp, c.created_at) as created_at
       FROM conversations c
       WHERE c.user_id = ? AND c.character_id = ?
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(user.id, characterId)
      .all();

    const conversations = historyResults.results || [];

    // 儀式完了後の判定：guardianが設定されている場合
    // 儀式完了後は、APIの指示によりチャットをクリアし、会話はゼロからスタート
    const isAfterRitual = !!user.guardian;

    // 他のキャラクターとの会話履歴があるかどうかを確認
    // 現在のキャラクター以外（kaede, yukino, sora, kaon）との会話履歴を確認
    const allCharacters = ['kaede', 'yukino', 'sora', 'kaon'];
    const otherCharacters = allCharacters.filter(c => c !== characterId);
    
    let hasOtherCharacterHistory = false;
    if (conversations.length === 0 && otherCharacters.length > 0) {
      // 現在のキャラクターとの会話履歴がない場合、他のキャラクターとの会話履歴を確認
      // SQLクエリを動的に構築（IN句を使用）
      const placeholders = otherCharacters.map(() => '?').join(',');
      const otherHistoryResults = await env.DB.prepare<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM conversations
         WHERE user_id = ? AND character_id IN (${placeholders})
         LIMIT 1`
      )
        .bind(user.id, ...otherCharacters)
        .first();
      
      hasOtherCharacterHistory = (otherHistoryResults?.count || 0) > 0;
    }

    if (conversations.length === 0) {
      // 訪問パターンを判定（初回訪問時）
      const visitPatternInfo = await detectVisitPattern({
        userId: user.id,
        characterId: characterId,
        database: env.DB,
        isRegisteredUser: !!user.nickname,
      });
      
      // 履歴がない場合、welcomeMessageを生成
      let welcomeMessage: string | null = null;
      let requireGuardianConsent: boolean = false;
      
      // 楓専用: 守護神状態を確認
      if (characterId === 'kaede') {
        const hasGuardian = !!user.guardian && user.guardian.trim() !== '';
        
        if (!hasGuardian) {
          // 守護神未決定: 儀式同意を促すメッセージを生成
          requireGuardianConsent = true;
          try {
            // 守護神未決定時のシステムプロンプトを生成（訪問パターンは既に取得済み）
            let userGender: string | null = null;
            let userBirthDate: string | null = null;
            
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
              console.error('[conversation-history] ユーザー情報取得エラー:', error);
            }
            
            const systemPrompt = generateSystemPrompt(characterId, {
              userNickname: user.nickname,
              hasPreviousConversation: false,
              guardian: null, // 守護神未決定
              isRitualStart: false,
              isJustRegistered: false,
              userMessageCount: 0,
              userGender: userGender,
              userBirthDate: userBirthDate,
              visitPattern: visitPatternInfo?.pattern || 'first_visit',
              conversationHistory: visitPatternInfo?.conversationHistory || [],
              lastConversationSummary: visitPatternInfo?.lastConversationSummary || null,
              sessionContext: visitPatternInfo?.sessionContext || null,
            });
            
            const apiKey = env.DEEPSEEK_API_KEY;
            if (apiKey) {
              const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
              const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
              const maxTokensForCharacter = 2000;
              const temperatureForCharacter = 0.7;
              const topPForCharacter = 0.9;
              
              const userMessage = '初めてお会いします。よろしくお願いします。';
              const conversationHistory: ClientHistoryEntry[] = [];
              
              const llmResult = await getLLMResponse({
                systemPrompt,
                conversationHistory,
                userMessage,
                temperature: temperatureForCharacter,
                maxTokens: maxTokensForCharacter,
                topP: topPForCharacter,
                deepseekApiKey: apiKey,
                fallbackApiKey: fallbackApiKey,
                fallbackModel: fallbackModel,
              });
              
              if (llmResult.success && llmResult.message) {
                welcomeMessage = llmResult.message;
                console.log('[conversation-history] ✅ 楓の守護神未決定時のwelcomeMessageを生成しました');
              } else {
                welcomeMessage = getFallbackWelcomeMessage(characterId);
              }
            } else {
              welcomeMessage = getFallbackWelcomeMessage(characterId);
            }
          } catch (error) {
            console.error('[conversation-history] 楓の守護神未決定時のwelcomeMessage生成エラー:', error);
            welcomeMessage = getFallbackWelcomeMessage(characterId);
          }
        } else {
          // 守護神決定済み: 通常のwelcomeMessageを生成
          try {
            welcomeMessage = await generateWelcomeMessage({
              characterId,
              user,
              env,
            });
            console.log('[conversation-history] welcomeMessage生成結果:', {
              success: !!welcomeMessage,
              messageLength: welcomeMessage?.length || 0,
            });
          } catch (error) {
            console.error('[conversation-history] welcomeMessage生成エラー:', error);
            welcomeMessage = getFallbackWelcomeMessage(characterId);
          }
        }
      } else {
        // 楓以外: 通常のwelcomeMessageを生成
        try {
          welcomeMessage = await generateWelcomeMessage({
            characterId,
            user,
            env,
          });
          console.log('[conversation-history] welcomeMessage生成結果:', {
            success: !!welcomeMessage,
            messageLength: welcomeMessage?.length || 0,
          });
        } catch (error) {
          console.error('[conversation-history] welcomeMessage生成エラー:', error);
          welcomeMessage = getFallbackWelcomeMessage(characterId);
        }
      }

      return new Response(
        JSON.stringify({
          hasHistory: false,
          hasOtherCharacterHistory,
          nickname: user.nickname,
          birthYear: user.birth_year,
          birthMonth: user.birth_month,
          birthDay: user.birth_day,
          assignedDeity: user.guardian,
          clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
          welcomeMessage: welcomeMessage, // 初回訪問時のウェルカムメッセージ
          requireGuardianConsent: characterId === 'kaede' ? requireGuardianConsent : undefined, // 楓専用フラグ
          visitPattern: visitPatternInfo?.pattern || 'first_visit', // 訪問パターン
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

    // 時系列順に並び替え
    const sortedConversations = conversations.slice().reverse();

    // 最後の会話日時を取得（最新のメッセージのtimestamp）
    const lastConversationDate = sortedConversations.length > 0 
      ? sortedConversations[sortedConversations.length - 1].created_at 
      : null;

    // 最近のメッセージを返す（最新10件、created_atも含める）
    // SQLクエリでmessage as contentとしてエイリアスしているため、row.contentに値が入る
    const recentMessages = sortedConversations.slice(-10).map((row) => ({
      role: row.role,
      content: row.content || row.message || '', // SQLエイリアスでcontentに値が入るが、フォールバックとしてmessageも確認
      created_at: row.created_at,
    }));

    // 会話履歴をClientHistoryEntry形式に変換
    const conversationHistoryForLLM: ClientHistoryEntry[] = sortedConversations.map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
    }));

    // 最後のユーザーメッセージを抽出
    const lastUserMessage = sortedConversations
      .filter((msg) => msg.role === 'user')
      .slice(-1)[0]?.content || null;

    // 訪問パターンを判定
    const visitPatternInfo = await detectVisitPattern({
      userId: user.id,
      characterId: characterId,
      database: env.DB,
      isRegisteredUser: !!user.nickname,
    });

    // 再訪問メッセージを生成
    let returningMessage: string | null = null;
    try {
      returningMessage = await generateReturningMessage({
        characterId,
        user,
        conversationHistory: conversationHistoryForLLM,
        lastUserMessage,
        env,
      });
      console.log('[conversation-history] returningMessage生成結果:', {
        success: !!returningMessage,
        messageLength: returningMessage?.length || 0,
      });
    } catch (error) {
      console.error('[conversation-history] returningMessage生成エラー:', error);
      // エラー時もフォールバックメッセージを設定
      returningMessage = getFallbackReturningMessage(characterId);
    }

    // 会話の要約を生成（最後の数件のメッセージから）
    // SQLクエリでmessage as contentとしてエイリアスしているため、msg.contentに値が入る
    const lastMessages = sortedConversations.slice(-6);
    const conversationText = lastMessages
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : '鑑定士'}: ${msg.content || msg.message || ''}`)
      .join('\n');

    // 今日の最初のユーザーメッセージを取得（儀式完了後の定型文で使用）
    let firstQuestion: string | undefined = undefined;
    if (isAfterRitual) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const todayMessages = sortedConversations.filter((msg) => {
        if (msg.role !== 'user') return false;
        if (!msg.created_at) return false;
        return msg.created_at.startsWith(todayStr);
      });
      if (todayMessages.length > 0) {
        firstQuestion = todayMessages[0].content || todayMessages[0].message || '';
        console.log('[conversation-history] 今日のfirstQuestion取得:', {
          message: firstQuestion.substring(0, 50) + '...',
          created_at: todayMessages[0].created_at,
          todayStr: todayStr,
          totalTodayUserMessages: todayMessages.length,
          totalUserMessages: sortedConversations.filter(m => m.role === 'user').length
        });
      } else {
        console.log('[conversation-history] 今日のfirstQuestion取得失敗:', {
          todayStr: todayStr,
          totalUserMessages: sortedConversations.filter(m => m.role === 'user').length,
          allDates: sortedConversations.filter(m => m.role === 'user').map(m => m.created_at).slice(0, 5)
        });
      }
    }

    return new Response(
      JSON.stringify({
        hasHistory: true,
        hasOtherCharacterHistory: true, // 現在のキャラクターとの会話履歴がある場合、他のキャラクターとの会話履歴も確認済みとして扱う
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.guardian, // guardianカラムから取得
        lastConversationDate,
        recentMessages,
        conversationSummary: conversationText,
        clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
        firstQuestion: firstQuestion, // 最初の質問（儀式完了後の定型文で使用）
        returningMessage: returningMessage, // 再訪問時のメッセージ
        visitPattern: visitPatternInfo?.pattern || 'returning', // 訪問パターン
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in conversation-history endpoint:', error);
    return new Response(
      JSON.stringify({
        hasHistory: false,
        error: 'Internal server error',
      } as ResponseBody),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};





