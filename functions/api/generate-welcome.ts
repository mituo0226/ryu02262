// Cloudflare Pages Functions の型定義
import { generateSystemPrompt } from '../_lib/character-system.js';
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';
import { getHealthChecker } from '../_lib/api-health-checker.js';

// ===== 定数 =====
const MAX_DEEPSEEK_RETRIES = 3;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';
const API_TIMEOUT = 10000; // 10秒（最適化：15秒から短縮）

// ===== 型定義 =====
interface ClientHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  character: string;
  userId: number | string; // 数値または文字列として受け取る
  conversationHistory?: ClientHistoryEntry[]; // フロントエンドから受け取るが、バックエンドで再取得するため使用しない
  visitPattern?: string;
}

interface ResponseBody {
  success: boolean;
  message?: string;
  error?: string;
  metadata?: {
    usedAPI: 'deepseek' | 'openai' | 'fallback';
    timestamp: string;
  };
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

interface UserRecord {
  id: number;
  nickname: string;
  guardian: string | null;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  gender?: string | null;
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

        // リトライ前に待機（最適化：待機時間を短縮）
        if (attempt < MAX_DEEPSEEK_RETRIES) {
          await sleep(200 * attempt); // 300 * attempt * attempt → 200 * attempt に短縮
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
          await sleep(200 * attempt); // 300 * attempt * attempt → 200 * attempt に短縮
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown DeepSeek error';
      lastError = message;
      console.error('DeepSeek API error:', { attempt, message });
        if (attempt < MAX_DEEPSEEK_RETRIES) {
          await sleep(200 * attempt); // 300 * attempt * attempt → 200 * attempt に短縮
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

  // DeepSeekを使用すべきか判定
  if (healthChecker.shouldUseDeepSeek()) {
    try {
      console.log('[generate-welcome] Attempting DeepSeek API...');
      aiResponse = await callDeepSeek(params);

      if (aiResponse.success) {
        healthChecker.recordDeepSeekSuccess();
        usedAPI = 'deepseek';
        console.log('[generate-welcome] ✅ DeepSeek API から応答を取得しました');
        return aiResponse;
      } else {
        healthChecker.recordDeepSeekFailure();
        console.log('[generate-welcome] ⚠️ DeepSeek API 失敗、OpenAI にフォールバック:', aiResponse.error);

        // OpenAIフォールバック
        try {
          console.log('[generate-welcome] Falling back to OpenAI...');
          aiResponse = await callOpenAI(params);

          if (aiResponse.success) {
            healthChecker.recordOpenAISuccess();
            usedAPI = 'openai';
            console.log('[generate-welcome] ✅ OpenAI API から応答を取得しました');
            return aiResponse;
          } else {
            healthChecker.recordOpenAIFailure();
            console.error('[generate-welcome] ❌ OpenAI API も失敗しました:', aiResponse.error);
            throw new Error(`Both DeepSeek and OpenAI APIs failed`);
          }
        } catch (openaiError) {
          healthChecker.recordOpenAIFailure();
          console.error('[generate-welcome] ❌ OpenAI API 呼び出しエラー:', openaiError);
          throw new Error(`Both DeepSeek and OpenAI APIs failed`);
        }
      }
    } catch (error) {
      healthChecker.recordDeepSeekFailure();
      console.error('[generate-welcome] ❌ DeepSeek API 呼び出しエラー:', error);

      // OpenAIフォールバック
      try {
        console.log('[generate-welcome] Falling back to OpenAI after error...');
        aiResponse = await callOpenAI(params);

        if (aiResponse.success) {
          healthChecker.recordOpenAISuccess();
          usedAPI = 'openai';
          console.log('[generate-welcome] ✅ OpenAI API から応答を取得しました');
          return aiResponse;
        } else {
          healthChecker.recordOpenAIFailure();
          console.error('[generate-welcome] ❌ OpenAI API も失敗しました');
          throw new Error(`Both DeepSeek and OpenAI APIs failed`);
        }
      } catch (openaiError) {
        healthChecker.recordOpenAIFailure();
        console.error('[generate-welcome] ❌ OpenAI API 呼び出しエラー:', openaiError);
        throw new Error(`Both DeepSeek and OpenAI APIs failed`);
      }
    }
  } else {
    // DeepSeekがクールダウン中、直接OpenAIを使用
    try {
      console.log('[generate-welcome] Using OpenAI (DeepSeek in cooldown)...');
      aiResponse = await callOpenAI(params);

      if (aiResponse.success) {
        healthChecker.recordOpenAISuccess();
        usedAPI = 'openai';
        console.log('[generate-welcome] ✅ OpenAI API から応答を取得しました');
        return aiResponse;
      } else {
        healthChecker.recordOpenAIFailure();
        console.error('[generate-welcome] ❌ OpenAI API 失敗:', aiResponse.error);
        throw new Error(`OpenAI API failed: ${aiResponse.error}`);
      }
    } catch (error) {
      healthChecker.recordOpenAIFailure();
      console.error('[generate-welcome] ❌ OpenAI API 呼び出しエラー:', error);
      throw new Error(`OpenAI API failed`);
    }
  }
}

/**
 * 会話要約生成
 */
function generateConversationSummary(history: ClientHistoryEntry[]): { date: string; topics: string[]; messageCount: number } | null {
  if (history.length === 0) return null;

  const recentMessages = history.slice(-3); // 最新3件のみを使用
  const lastUserMessages = recentMessages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .slice(-2);

  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    date: dateStr,
    topics: lastUserMessages,
    messageCount: history.length,
  };
}

/**
 * フォールバックメッセージ生成
 */
function generateFallbackMessage(characterId: string, user: UserRecord, visitPattern: string): string {
  const nickname = user?.nickname || 'あなた';

  const templates: Record<string, Record<string, string>> = {
    kaede: {
      first_visit: 'ようこそ、楓の神社へ。あなたの守護神を見つけるお手伝いをさせていただきます。',
      returning: `お帰りなさい、${nickname}さん。また会えて嬉しいです。`,
    },
    yukino: {
      first_visit: 'いらっしゃいませ。タロットカードであなたの未来を占いましょう。',
      returning: `いらっしゃいませ、${nickname}さん。お待ちしておりました。`,
      continuing: `${nickname}さん、続きをお話ししましょう。`,
    },
    sora: {
      first_visit: 'こんにちは。どんなお悩みでもお聞きします。一緒に考えましょう。',
      returning: `こんにちは、${nickname}さん。また相談に来てくれたんですね。`,
      continuing: `${nickname}さん、前回の話の続きですね。`,
    },
    kaon: {
      first_visit: 'お待ちしておりました。あなたのお悩み、聞かせていただけますか？',
      returning: `お久しぶりです、${nickname}さん。お元気でしたか？`,
      continuing: `${nickname}さん、続きをお話しください。`,
    },
  };

  return templates[characterId]?.[visitPattern] || `こんにちは、${nickname}さん。`;
}

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = (await request.json()) as RequestBody;
    const { character, userId, conversationHistory = [], visitPattern = 'first_visit' } = body;

    if (!character || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: character and userId',
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ユーザーIDを数値に変換して検証
    const userIdNumber = Number(userId);
    if (!Number.isFinite(userIdNumber) || userIdNumber <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid userId',
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ユーザー情報取得
    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, guardian, birth_year, birth_month, birth_day, gender FROM users WHERE id = ?'
    )
      .bind(userIdNumber)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found',
        } as ResponseBody),
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    // 【重要】フロントエンドから受け取った履歴を信頼せず、データベースから直接取得
    // これにより、ユーザーIDの混在を防ぐ
    console.log('[generate-welcome] データベースから会話履歴を取得します:', {
      userId: userIdNumber,
      character,
    });

    // 再訪問時の返答生成には最新3件のみを使用するため、6件取得で十分
    // （要約生成用に3件、LLM API呼び出し用に3件）
    const historyResults = await env.DB.prepare<{
      role: 'user' | 'assistant';
      message: string;
      created_at: string;
      message_type?: string;
    }>(
      `SELECT c.role, c.message, COALESCE(c.timestamp, c.created_at) as created_at, c.message_type
       FROM conversations c
       WHERE c.user_id = ? AND c.character_id = ?
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 6`
    )
      .bind(userIdNumber, character)
      .all();

    // データベースから取得した履歴を使用（古い順に並び替え）
    const dbConversationHistory: ClientHistoryEntry[] = (historyResults.results || [])
      .reverse()
      .map((row) => ({
        role: row.role,
        content: row.message || '',
      }));

    console.log('[generate-welcome] データベースから取得した履歴:', {
      userId: userIdNumber,
      character,
      historyLength: dbConversationHistory.length,
      usedForLLM: Math.min(dbConversationHistory.length, 3), // LLM API呼び出しで使用する件数
    });

    // 訪問パターン判定（フロントエンドから渡されたvisitPatternを優先）
    // 【最適化】フロントエンドからvisitPatternが渡されている場合は、detectVisitPatternを完全にスキップ
    let finalVisitPattern = visitPattern;
    if (!visitPattern || visitPattern === 'first_visit') {
      // フロントエンドからvisitPatternが渡されていない場合のみ、再判定
      // 【注意】この場合でも、既に取得したdbConversationHistoryから判定できるため、
      // detectVisitPattern内の重複クエリを避けるため、簡易判定を実装
      if (dbConversationHistory.length > 0) {
        finalVisitPattern = 'returning';
        console.log('[generate-welcome] 会話履歴から判定: returning（履歴あり）');
      } else if (user.nickname) {
        finalVisitPattern = 'continuing';
        console.log('[generate-welcome] 会話履歴から判定: continuing（履歴なしの再訪問）');
      } else {
        finalVisitPattern = 'first_visit';
        console.log('[generate-welcome] 会話履歴から判定: first_visit');
      }
    } else {
      // フロントエンドから渡されたvisitPatternを使用
      console.log('[generate-welcome] フロントエンドから渡されたvisitPatternを使用:', visitPattern);
    }

    // ユーザー情報を準備
    let userGender: string | null = null;
    let userBirthDate: string | null = null;
    let isJustRegistered = dbConversationHistory.length === 0;

    if (user.gender) {
      userGender = user.gender;
    }
    if (user.birth_year && user.birth_month && user.birth_day) {
      const yearStr = String(user.birth_year).padStart(4, '0');
      const monthStr = String(user.birth_month).padStart(2, '0');
      const dayStr = String(user.birth_day).padStart(2, '0');
      userBirthDate = `${yearStr}-${monthStr}-${dayStr}`;
    }

    console.log('[generate-welcome] 初回訪問判定:', {
      character,
      userNickname: user.nickname,
      isJustRegistered,
      dbConversationHistoryLength: dbConversationHistory.length,
    });

    // 会話要約を生成（データベースから取得した履歴を使用）
    const conversationSummary = generateConversationSummary(dbConversationHistory);

    // システムプロンプト生成（データベースから取得した履歴を使用）
    const systemPrompt = generateSystemPrompt(character, {
      userNickname: user.nickname,
      hasPreviousConversation: dbConversationHistory.length > 0,
      guardian: user.guardian || null,
      isRitualStart: false,
      isJustRegistered: isJustRegistered,
      userMessageCount: dbConversationHistory.filter((m) => m.role === 'user').length,
      userGender: userGender,
      userBirthDate: userBirthDate,
      visitPattern: finalVisitPattern,
      conversationHistory: dbConversationHistory, // データベースから取得した履歴を使用
      lastConversationSummary: conversationSummary,
      sessionContext: null,
    });

    // ウェルカムメッセージ用のユーザーメッセージを生成
    let userMessage: string;
    if (finalVisitPattern === 'first_visit') {
      userMessage = '初めてお会いします。よろしくお願いします。';
    } else if (finalVisitPattern === 'returning') {
      // 最後のユーザーメッセージを参照（データベースから取得した履歴から）
      const lastUserMsg = dbConversationHistory.filter((m) => m.role === 'user').slice(-1)[0];
      userMessage = lastUserMsg?.content || 'また来ました。';
    } else {
      userMessage = '前回の続きです。';
    }

    // LLM API呼び出し
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[generate-welcome] DEEPSEEK_API_KEYが設定されていません');
      const fallbackMessage = generateFallbackMessage(character, user, finalVisitPattern);
      return new Response(
        JSON.stringify({
          success: true,
          message: fallbackMessage,
          metadata: {
            usedAPI: 'fallback',
            timestamp: new Date().toISOString(),
          },
        } as ResponseBody),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    // キャラクターに応じたパラメータ設定（最適化：ウェルカムメッセージは短めに）
    const maxTokensForCharacter = character === 'kaede' || character === 'kaon' ? 800 : 400; // 1000→800, 500→400に短縮
    const temperatureForCharacter = character === 'kaede' || character === 'kaon' ? 0.7 : 0.5;
    const topPForCharacter = character === 'kaede' || character === 'kaon' ? 0.9 : 0.8;

    try {
      const llmResult = await getLLMResponse({
        systemPrompt,
        conversationHistory: dbConversationHistory.slice(-3), // データベースから取得した履歴の最近3件のみ
        userMessage,
        temperature: temperatureForCharacter,
        maxTokens: maxTokensForCharacter,
        topP: topPForCharacter,
        deepseekApiKey: apiKey,
        fallbackApiKey: fallbackApiKey,
        fallbackModel: fallbackModel,
      });

      if (llmResult.success && llmResult.message) {
        return new Response(
          JSON.stringify({
            success: true,
            message: llmResult.message,
            metadata: {
              usedAPI: llmResult.provider || 'deepseek',
              timestamp: new Date().toISOString(),
            },
          } as ResponseBody),
          {
            status: 200,
            headers: corsHeaders,
          }
        );
      } else {
        // LLM API失敗時はフォールバック
        const fallbackMessage = generateFallbackMessage(character, user, finalVisitPattern);
        return new Response(
          JSON.stringify({
            success: true,
            message: fallbackMessage,
            metadata: {
              usedAPI: 'fallback',
              timestamp: new Date().toISOString(),
            },
          } as ResponseBody),
          {
            status: 200,
            headers: corsHeaders,
          }
        );
      }
    } catch (error) {
      console.error('[generate-welcome] LLM API呼び出しエラー:', error);
      // エラー時もフォールバック
      const fallbackMessage = generateFallbackMessage(character, user, finalVisitPattern);
      return new Response(
        JSON.stringify({
          success: true,
          message: fallbackMessage,
          metadata: {
            usedAPI: 'fallback',
            timestamp: new Date().toISOString(),
          },
        } as ResponseBody),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }
  } catch (error) {
    console.error('[generate-welcome] エラー:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ResponseBody),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
