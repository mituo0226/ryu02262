// Cloudflare Pages Functions の型定義
import { isInappropriate, generateSystemPrompt, getCharacterName } from '../lib/character-system.js';
import { isValidCharacter } from '../lib/character-loader.js';
import { verifyUserToken } from '../lib/token.js';

const GUEST_MESSAGE_LIMIT = 10;
const MAX_DEEPSEEK_RETRIES = 3;
const DEBUG_MODE = true;
const DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';

type ConversationRole = 'user' | 'assistant';

interface ClientHistoryEntry {
  role: ConversationRole;
  content: string;
}

interface GuestMetadata {
  messageCount?: number;
}

interface RequestBody {
  message: string;
  character?: string;
  userToken?: string;
  clientHistory?: ClientHistoryEntry[];
  migrateHistory?: boolean;
  guestMetadata?: GuestMetadata;
  forceProvider?: 'deepseek' | 'openai'; // テスト用: プロバイダーを強制指定
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
  provider?: 'deepseek' | 'openai'; // 使用したLLMプロバイダー（デバッグ用）
  assignedDeity?: string; // 守護神の儀式完了時に抽出した守護神名
}

interface UserRecord {
  id: number;
  nickname: string;
  assigned_deity: string;
}

interface ConversationRow {
  role: ConversationRole;
  message: string;
}

function sanitizeClientHistory(entries?: ClientHistoryEntry[]): ClientHistoryEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => {
      if (!entry || (entry.role !== 'user' && entry.role !== 'assistant')) {
        return null;
      }
      if (typeof entry.content !== 'string') {
        return null;
      }
      const trimmed = entry.content.trim();
      if (!trimmed) {
        return null;
      }
      return { role: entry.role, content: trimmed };
    })
    .filter((entry): entry is ClientHistoryEntry => Boolean(entry))
    .slice(-12);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * メッセージを圧縮する関数（メモリー消費を削減）
 * @param {string} message - 元のメッセージ
 * @param {number} maxLength - 最大文字数
 * @returns {string} 圧縮されたメッセージ
 */
function compressMessage(message: string, maxLength: number): string {
  if (!message || message.length <= maxLength) {
    return message;
  }
  
  // 長いメッセージの場合は、最初と最後の部分を残して中間を省略
  const firstPart = message.substring(0, Math.floor(maxLength * 0.6));
  const lastPart = message.substring(message.length - Math.floor(maxLength * 0.3));
  const compressed = `${firstPart}...（省略）...${lastPart}`;
  
  // さらに長い場合は、最初の部分のみを残す
  if (compressed.length > maxLength) {
    return message.substring(0, maxLength - 3) + '...';
  }
  
  return compressed;
}

// 登録ユーザーの会話履歴管理設定
const REGISTERED_USER_HISTORY_CONFIG = {
  maxStoredMessages: 10, // 最新10通のみ保存
  compression: {
    enabled: true, // メモリー消費を削減するため、会話履歴を圧縮して保存
    userMessageMaxLength: 200, // ユーザーメッセージの最大文字数
    assistantMessageMaxLength: 300, // アシスタントメッセージの最大文字数
    profileMaxLength: 1500 // プロフィール情報の最大文字数
  },
  profileExtraction: {
    enabled: true,
    maxMessagesForProfile: 100, // 100通までの会話内容からプロフィール情報を抽出
    description: '過去100通までの会話内容からプロフィール情報を抽出して記憶（圧縮された記憶）'
  }
};

const isServiceBusyError = (status: number, errorText: string) => {
  const normalized = (errorText || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    normalized.includes('service is too busy') ||
    normalized.includes('please try again later') ||
    normalized.includes('rate limit')
  );
};

/**
 * 会話履歴から「守護神の儀式に同意」を検出する関数
 * フェーズ4でユーザーが儀式に同意した場合、10通の制限に関係なく登録ボタンを表示する
 */
function detectGuardianRitualConsent(
  conversationHistory: ClientHistoryEntry[],
  currentMessage: string,
  characterId: string
): boolean {
  // 楓（kaede）のみ対象
  if (characterId !== 'kaede') {
    return false;
  }

  // 守護神・儀式に関連するキーワード
  const ritualKeywords = [
    '守護神',
    '儀式',
    '守護',
    '導き出す',
    '呼び出す',
    '整える',
    '波長',
    'エネルギー',
  ];

  // 同意を示す表現
  const consentKeywords = [
    'やってみたい',
    'やってみます',
    'お願いします',
    'お願い',
    '受けたい',
    '受けます',
    'やります',
    'はい',
    '同意',
    '了解',
    'わかりました',
    'ok',
    'okです',
    'ok！',
    'ok?',
    'ok.',
    'ok ',
    'okay',
    'okayです',
    'おk',
    'おkです',
  ];

  // 最新のユーザーメッセージ（現在のメッセージを含む）
  const recentMessages = [...conversationHistory, { role: 'user' as const, content: currentMessage }]
    .filter(msg => msg.role === 'user')
    .slice(-3); // 直近3件のユーザーメッセージを確認

  // 会話履歴全体から守護神・儀式の言及を確認
  const allMessages = [...conversationHistory, { role: 'user' as const, content: currentMessage }];
  const hasRitualMention = allMessages.some(msg => {
    const text = msg.content.toLowerCase();
    return ritualKeywords.some(keyword => text.includes(keyword));
  });

  if (!hasRitualMention) {
    return false;
  }

  // 直近のユーザーメッセージに同意表現があるか確認
  const hasConsent = recentMessages.some(msg => {
    const text = msg.content.toLowerCase();
    return consentKeywords.some(keyword => text.includes(keyword));
  });

  return hasConsent;
}

const extractErrorMessage = (text: string, fallback: string) => {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) {
      return parsed.error.message as string;
    }
    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }
  } catch {
    // ignore JSON parse errors
  }
  return text || fallback;
};

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
  forceProvider?: 'deepseek' | 'openai'; // テスト用: プロバイダーを強制指定
}

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
        if (DEBUG_MODE) {
          console.log('🔍 DEBUG: DeepSeek API response', {
            attempt,
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length || 0,
            finishReason: data.choices?.[0]?.finish_reason || 'N/A',
          });
        }
        return {
          success: Boolean(message?.trim()),
          message: message?.trim(),
          provider: 'deepseek',
          rawResponse: data,
        };
      }

      const errorText = await response.text();
      lastError = extractErrorMessage(errorText, 'Failed to get response from DeepSeek API');
      console.error('DeepSeek API error:', {
        attempt,
        status: response.status,
        errorText,
      });

      if (!isServiceBusyError(response.status, errorText)) {
        return {
          success: false,
          error: lastError,
          status: response.status,
        };
      }

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

  return {
    success: false,
    error: lastError,
  };
}

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
    return { success: false, error: 'OpenAI fallback API key is not configured' };
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    return {
      success: false,
      error: extractErrorMessage(errorText, 'Failed to get response from OpenAI API'),
      status: response.status,
    };
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;

  if (DEBUG_MODE) {
    console.log('🔍 DEBUG: OpenAI API response', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      finishReason: data.choices?.[0]?.finish_reason || 'N/A',
    });
  }

  return {
    success: Boolean(message?.trim()),
    message: message?.trim(),
    provider: 'openai',
    rawResponse: data,
  };
}

async function getLLMResponse(params: LLMRequestParams): Promise<LLMResponseResult> {
  const { forceProvider, fallbackApiKey, fallbackModel } = params;

  // テスト用: プロバイダーが強制指定されている場合
  if (forceProvider === 'openai') {
    if (!fallbackApiKey) {
      return {
        success: false,
        error: 'OpenAI API key is not configured',
        provider: 'openai',
      };
    }
    return await callOpenAI({
      ...params,
      fallbackApiKey,
      fallbackModel: fallbackModel || DEFAULT_FALLBACK_MODEL,
    });
  }

  if (forceProvider === 'deepseek') {
    const result = await callDeepSeek(params);
    // DeepSeekが失敗してもフォールバックしない（テスト用）
    return result;
  }

  // 通常の動作: DeepSeekを試して、失敗したらOpenAIにフォールバック
  const deepseekResult = await callDeepSeek(params);

  if (deepseekResult.success) {
    return deepseekResult;
  }

  if (!fallbackApiKey) {
    return deepseekResult;
  }

  console.warn('DeepSeek unavailable, attempting fallback provider...', {
    error: deepseekResult.error,
  });

  const openAiResult = await callOpenAI({
    ...params,
    fallbackApiKey,
    fallbackModel: fallbackModel || DEFAULT_FALLBACK_MODEL,
  });
  
  if (openAiResult.success) {
    return openAiResult;
  }

  return {
    success: false,
    error: openAiResult.error || deepseekResult.error || 'Failed to generate response',
    status: openAiResult.status,
  };
}

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
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // 環境変数からAPIキーを取得
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API key is not configured',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // リクエストボディの解析
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // messageフィールドの検証
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'message field is required and must be a string',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'message cannot be empty',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // 守護神の儀式開始メッセージを検出
    const isRitualStart = trimmedMessage.includes('守護神の儀式を始めてください') || 
                          trimmedMessage.includes('守護神の儀式を始めて') ||
                          trimmedMessage === '守護神の儀式を始めてください';

    if (trimmedMessage.length > 1000) {
      return new Response(
        JSON.stringify({ 
          error: 'message is too long (maximum 1000 characters)',
          message: '',
          character: '',
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const characterId = body.character || 'kaede';
    if (!isValidCharacter(characterId)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid character ID: ${characterId}. Valid characters are: kaede, yukino, sora, kaon`,
          message: '',
          character: characterId,
          characterName: '',
          isInappropriate: false,
          detectedKeywords: []
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const guestMetadata = body.guestMetadata || {};
    const guestMessageCount = Number(guestMetadata.messageCount ?? 0);
    const sanitizedGuestCount = Number.isFinite(guestMessageCount) ? guestMessageCount : 0;
    const guestLimitReached = !body.userToken && sanitizedGuestCount >= GUEST_MESSAGE_LIMIT;
    // 登録を促すのは、10通目に達する直前まで（9通目まで）
    // 1通目: count=0, 2通目: count=1, ..., 9通目: count=8（この時点で促す）、10通目: count=9（登録必須）
    // 登録画面を表示するのは10通目に達した時点のみ
    // 
    // 【将来の拡張用】楓（kaede）だけ特別扱いする場合の例：
    // if (characterId === 'kaede') {
    //   // 楓は「3〜4通で性格診断 → 守護神の儀式 → その後のタイミングで登録ガイド」の流れを優先
    //   // 登録誘導は、儀式完了後かつ messageCount が一定以上の場合のみ
    //   // 例: shouldEncourageRegistration = !body.userToken && sanitizedGuestCount >= 12 && sanitizedGuestCount < GUEST_MESSAGE_LIMIT;
    //   // または、別のフラグ（例: hasCompletedGuardianRitual）で制御する
    // }
    let shouldEncourageRegistration = !body.userToken && sanitizedGuestCount >= 8 && sanitizedGuestCount < GUEST_MESSAGE_LIMIT;

    if (guestLimitReached) {
      // 10通目以降は「ユーザー登録をしてください」というメッセージのみ返す
      const characterName = getCharacterName(characterId);
      const registrationMessage =
        characterId === 'kaede'
          ? '無料でお話できるのはここまでです。守護神を最後まで導き出すには、あなたの生年月日が必要です。生年月日は、その人が生まれた瞬間の宇宙の配置を表し、龍神を通じて正確に守護神を導き出すための重要な鍵となります。そのため、生年月日とニックネームをユーザー登録していただく必要があります。登録は無料で、個人情報は厳重に管理されます。費用や危険は一切ありませんので、ご安心ください。登録ボタンから手続きを進めてください。'
          : 'これ以上鑑定を続けるには、ユーザー登録が必要です。生年月日とニックネームを教えていただくことで、より深い鑑定ができるようになります。登録ボタンから手続きをお願いします。';
      
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
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

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

      const record = await env.DB.prepare<UserRecord>('SELECT id, nickname, assigned_deity FROM users WHERE id = ?')
        .bind(tokenPayload.userId)
        .first();

      if (!record) {
        console.error('User not found in database:', {
          userId: tokenPayload.userId,
          tokenValid: true,
          characterId: characterId
        });
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
    }

    const sanitizedHistory = sanitizeClientHistory(body.clientHistory);

    const characterName = getCharacterName(characterId);

    const inappropriate = isInappropriate(trimmedMessage);
    const detectedKeywords: string[] = [];

    if (inappropriate) {
      const keywords = [
        '宝くじ', '当選', '当選番号', '当選確率',
        'ギャンブル', 'パチンコ', 'スロット', '競馬', '競艇',
        '不倫', '浮気', '裏切り', '悪意',
      ];
      const lowerMessage = trimmedMessage.toLowerCase();
      keywords.forEach((keyword) => {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          detectedKeywords.push(keyword);
        }
      });

      let warningMessage = '';

      switch (characterId) {
        case 'kaede':
          warningMessage = '私は現世で唯一の龍神の化身として、そのような悪しき願いを聞き入れることはできません。龍神としての私の力は、悪用される危険をはらむものには決して向けられません。そのような願いは、神界の秩序を乱すものです。';
          break;
        case 'yukino':
          warningMessage = '高野山での修行を通じて、私は学びました。そのような願いは、愛の力がない限り、運命は好転しない。これは、宇宙全体の真理であります。修行で培った信念として、そのようなご相談は、宇宙全体の真理に反するものです。';
          break;
        case 'sora':
          warningMessage = '正直、がっかりしています。そのような願いを抱いているあなたを見て、心が痛みます。そのような願いは、あなた自身を不幸にします。どうか、もう一度考え直してください。';
          break;
        case 'kaon':
          warningMessage = '私の未来予知の能力は、あまりにも確実に人の未来を読めるがゆえに、その責任は非常に重いものです。そのような願いは、その責任を軽んじる行為です。第三者の力により未来を変えることは、それが人生において良き方向に向けるためのものであり、そして誰かを不幸にしては決していけないのです。';
          break;
        default:
          warningMessage = 'そのようなご相談にはお答えできません。';
      }

      return new Response(
        JSON.stringify({
          message: warningMessage,
          character: characterId,
          characterName,
          isInappropriate: true,
          detectedKeywords,
          guestMode: !user,
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

    // デバッグログ用フラグ（本番では false に設定）
    // 一時的に true にして問題を調査する場合は true に変更
    let conversationHistory: ClientHistoryEntry[] = [];

    if (user) {
      // ログインユーザーの場合: データベースから履歴を取得（最新10通のみ）
      // 【重要】登録ユーザーのチャット履歴は最新10通のみ保存
      const historyResults = await env.DB.prepare<ConversationRow>(
        `SELECT role, message
         FROM conversations
         WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
         ORDER BY COALESCE(timestamp, created_at) DESC
         LIMIT 10`
      )
        .bind(user.id, characterId)
        .all();

      const dbHistory =
        historyResults.results?.slice().reverse().map((row) => ({
          role: row.role,
          content: row.message,
        })) ?? [];

      // ゲスト履歴の移行処理
      if (body.migrateHistory && sanitizedHistory.length > 0) {
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
        // 移行した履歴とDB履歴をマージ（重複を避ける）
        const sanitizedUserMessages = new Set(sanitizedHistory.filter(msg => msg.role === 'user').map(msg => msg.content));
        const uniqueDbHistory = dbHistory.filter(msg => {
          if (msg.role === 'user') {
            return !sanitizedUserMessages.has(msg.content);
          }
          return true;
        });
        conversationHistory = [...sanitizedHistory, ...uniqueDbHistory];
      } else {
        conversationHistory = dbHistory;
      }
    } else {
      // ゲストユーザーの場合: クライアントから送られてきた履歴を使用
      // 複数のソースから履歴を取得を試みる
      if (sanitizedHistory.length > 0) {
        conversationHistory = sanitizedHistory;
      } else if (body.clientHistory && Array.isArray(body.clientHistory) && body.clientHistory.length > 0) {
        // sanitizedHistory が空の場合は、clientHistory を直接使用
        conversationHistory = body.clientHistory.map((entry: any) => ({
          role: entry.role || 'user',
          content: entry.content || entry.message || '',
        }));
      } else {
        conversationHistory = [];
      }
      
      if (DEBUG_MODE) {
        console.log('🔍 DEBUG: Guest user history', {
          sanitizedHistoryLength: sanitizedHistory.length,
          clientHistoryLength: body.clientHistory?.length || 0,
          finalConversationHistoryLength: conversationHistory.length,
          guestMetadataMessageCount: sanitizedGuestCount,
        });
      }
    }

    // フェーズ4（未来・守護・儀式）で守護神の儀式に同意した場合、10通の制限に関係なく登録ボタンを表示
    if (!body.userToken && characterId === 'kaede') {
      const hasConsentedToRitual = detectGuardianRitualConsent(
        conversationHistory,
        body.message,
        characterId
      );
      
      if (hasConsentedToRitual) {
        shouldEncourageRegistration = true;
        if (DEBUG_MODE) {
          console.log('🔍 DEBUG: Guardian ritual consent detected - showing registration button early');
        }
      }
    }

    // デバッグ: ユーザー情報とニックネームを確認
    if (user) {
      console.log('User info:', {
        userId: user.id,
        nickname: user.nickname,
        assignedDeity: user.assigned_deity,
      });
    }

    // ユーザーメッセージの数を正しく計算
    // conversationHistory から user ロールのメッセージ数を取得
    const userMessagesInHistory = (conversationHistory || []).filter(msg => msg.role === 'user').length;
    // 今回送信されたメッセージを +1
    const calculatedUserMessageCount = userMessagesInHistory + 1;
    
    // ゲスト履歴から直接計算（migrateHistoryの場合）
    const userMessagesInGuestHistory = (sanitizedHistory || []).filter(msg => msg.role === 'user').length;
    const calculatedFromGuestHistory = userMessagesInGuestHistory + 1;
    
    // ゲストユーザーの場合、guestMetadata.messageCount を優先的に使用
    // （履歴が正しく送られていない可能性があるため）
    let userMessageCount: number;
    if (!user) {
      // ゲストユーザーの場合
      // guestMetadata.messageCount は「これまでのメッセージ数」なので、+1 した値が今回のメッセージ数
      const expectedCount = sanitizedGuestCount + 1;
      
      // 【重要】ゲストユーザーの場合、guestMetadata.messageCount を優先的に使用
      // 1通目の場合: sanitizedGuestCount = 0, expectedCount = 1
      // 2通目の場合: sanitizedGuestCount = 1, expectedCount = 2
      // というように、guestMetadata が正しく送信されていれば、それが最も信頼できる
      if (sanitizedGuestCount >= 0 && Number.isFinite(sanitizedGuestCount)) {
        // guestMetadata が存在し、有効な値の場合、それを優先使用
        userMessageCount = expectedCount;
        
        // ただし、conversationHistory から計算した値と大きく乖離している場合は警告
        if (calculatedUserMessageCount > 0 && Math.abs(calculatedUserMessageCount - expectedCount) > 3) {
          console.warn('⚠️ WARNING: Large discrepancy between guestMetadata and conversationHistory', {
            guestMetadataCount: sanitizedGuestCount,
            expectedCount,
            calculatedFromHistory: calculatedUserMessageCount,
            using: expectedCount
          });
        }
      } else {
        // guestMetadata がない、または無効な値の場合は conversationHistory を使用
        userMessageCount = calculatedUserMessageCount;
        
        if (DEBUG_MODE) {
          console.warn('⚠️ WARNING: No valid guestMetadata, using conversationHistory count', {
            sanitizedGuestCount,
            calculatedUserMessageCount
          });
        }
      }
      
      if (DEBUG_MODE) {
        console.log('🔍 DEBUG: Guest userMessageCount calculation', {
          userMessagesInHistory,
          calculatedUserMessageCount,
          sanitizedGuestCount,
          expectedCount: sanitizedGuestCount >= 0 ? sanitizedGuestCount + 1 : undefined,
          finalUserMessageCount: userMessageCount,
        });
      }
    } else {
      // ログインユーザーの場合
      // migrateHistoryがtrueの場合は、ゲスト履歴から計算した値を使用（登録直後の場合）
      if (body.migrateHistory && sanitizedHistory.length > 0) {
        userMessageCount = calculatedFromGuestHistory;
        if (DEBUG_MODE) {
          console.log('🔍 DEBUG: Registered user with migrateHistory - using guest history count', {
            userMessagesInGuestHistory,
            calculatedFromGuestHistory,
            conversationHistoryLength: conversationHistory.length,
            userMessagesInHistory,
            calculatedUserMessageCount
          });
        }
      } else {
        // 通常のログインユーザーの場合、conversationHistory から計算した値を使用
        userMessageCount = calculatedUserMessageCount;
      }
    }
    
    // 最終的な userMessageCount を保証（最小値1、NaN や undefined を防ぐ）
    userMessageCount = Math.max(1, Number.isFinite(userMessageCount) ? userMessageCount : 1);

    // userMessageCount が正しく渡されることを保証
    const finalUserMessageCount = Number.isFinite(userMessageCount) && userMessageCount > 0 
      ? userMessageCount 
      : 1;
    
    if (DEBUG_MODE) {
      console.log('🔍 DEBUG: Final userMessageCount:', finalUserMessageCount);
      console.log('🔍 DEBUG: userMessageCount calculation', {
        conversationHistoryLength: conversationHistory.length,
        userMessagesInHistory: userMessagesInHistory,
        calculatedUserMessageCount: calculatedUserMessageCount,
        sanitizedGuestCount: sanitizedGuestCount,
        finalUserMessageCount: finalUserMessageCount,
        conversationHistory: conversationHistory.map(msg => ({ 
          role: msg.role, 
          content: msg.content.substring(0, 50) 
        })),
      });
    }

    // プロフィール情報を取得（過去100通までの会話内容から抽出した記憶）
    let conversationProfile: string | undefined = undefined;
    if (user) {
      try {
        const userProfileResult = await env.DB.prepare<{ conversation_profile: string }>(
          'SELECT conversation_profile FROM users WHERE id = ?'
        )
          .bind(user.id)
          .first();
        conversationProfile = userProfileResult?.conversation_profile || undefined;
      } catch (error) {
        // conversation_profileカラムが存在しない場合は無視
        console.log('⚠️ conversation_profileカラムが存在しないため、プロフィール情報の取得をスキップしました');
      }
    }

    const systemPrompt = generateSystemPrompt(characterId, {
      encourageRegistration: shouldEncourageRegistration,
      userNickname: user?.nickname,
      hasPreviousConversation: conversationHistory.length > 0,
      conversationHistoryLength: conversationHistory.length,
      userMessageCount: finalUserMessageCount, // 必ず正しい数値が渡される
      isRitualStart: isRitualStart, // 守護神の儀式開始メッセージかどうか
      conversationProfile: conversationProfile, // 過去100通までのプロフィール情報（圧縮された記憶）
    });

    if (DEBUG_MODE) {
      console.log('🔍 DEBUG: systemPrompt generation', {
        characterId,
        userMessageCount: finalUserMessageCount,
        includesPhaseInstruction: systemPrompt.includes('現在のフェーズ'),
        includesHearingPhase: systemPrompt.includes('ヒアリング'),
        includesDiagnosisPhase: systemPrompt.includes('診断・儀式'),
        includesGuardianRitual: systemPrompt.includes('守護神'),
        systemPromptLength: systemPrompt.length,
        phaseInstructionAtStart: characterId === 'kaede' ? systemPrompt.substring(0, 200).includes('フェーズ1') : false,
        phaseInstructionAtEnd: characterId === 'kaede' ? systemPrompt.substring(systemPrompt.length - 200).includes('フェーズ1') : false,
      });
    }

    // デバッグ: システムプロンプトにニックネームが含まれているか確認
    if (user?.nickname) {
      console.log('System prompt includes nickname:', systemPrompt.includes(user.nickname));
      console.log('Nickname in prompt:', user.nickname);
    }

    // GPT-API という名前で登録されている環境変数を優先的に使用
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;

    // テスト用: プロバイダーを強制指定
    const forceProvider = body.forceProvider as 'deepseek' | 'openai' | undefined;

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
      forceProvider,
    });

    if (DEBUG_MODE) {
      console.log('🔍 DEBUG: LLM result summary', {
        provider: llmResult.provider || 'unknown',
        success: llmResult.success,
        hasMessage: !!llmResult.message,
        error: llmResult.error,
      });
    }

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
    
    // 【重要】守護神の儀式完了時に、LLMの応答から守護神名を抽出してデータベースに保存
    let extractedDeity: string | null = null;
    if (user && characterId === 'kaede' && isRitualStart) {
      // 守護神名の抽出パターン（クライアント側と同じパターン）
      const deityPatterns = [
        /あなたの守護神は[\s「『]?([^」』\s。、]+)/,
        /守護神は[\s「『]?([^」』\s。、]+)/,
        /([^。、\s]+)があなたの守護神です/,
        /([^。、\s]+)が守護神です/,
        /([^。、\s]+)が見守っています/,
        /守護神[はが]「([^」]+)」/,
        /守護神[はが]『([^』]+)』/,
        /守護神[はが]([^。、\s]+)です/
      ];
      
      for (const pattern of deityPatterns) {
        const match = responseMessage.match(pattern);
        if (match && match[1]) {
          extractedDeity = match[1].trim();
          // 「未割当」や空文字列は除外
          if (extractedDeity && extractedDeity !== '未割当' && extractedDeity.length > 0) {
            break;
          }
        }
      }
      
      // 守護神名が抽出できた場合、データベースに保存
      if (extractedDeity && extractedDeity !== '未割当' && extractedDeity.length > 0) {
        try {
          await env.DB.prepare(
            `UPDATE users 
             SET assigned_deity = ? 
             WHERE id = ?`
          )
            .bind(extractedDeity, user.id)
            .run();
          
          if (DEBUG_MODE) {
            console.log(`✅ 守護神をデータベースに保存しました: user_id=${user.id}, assigned_deity=${extractedDeity}`);
          }
        } catch (error) {
          console.error('⚠️ 守護神の保存エラー:', error);
          // エラーが発生しても処理を続行
        }
      } else {
        if (DEBUG_MODE) {
          console.log('⚠️ 守護神名の抽出に失敗しました。応答メッセージ:', responseMessage.substring(0, 200));
        }
      }
    }
    
    // タロットカード関連のキーワードを検出（笹岡雪乃の場合のみ）
    const tarotKeywords = ['タロット', 'タロットカード', 'カードを', 'カードをめく', 'カードを占', 'カードを引'];
    const showTarotCard = characterId === 'yukino' && tarotKeywords.some(keyword => responseMessage.includes(keyword));

    if (user) {
      // 【重要】登録ユーザーのチャット履歴管理:
      // - 最新10通のみ保存（10通を超える古いメッセージは削除）
      // - 100通までの会話内容からプロフィール情報を抽出して記憶
      // - チャットそのものは10通以降は消して構わない
      
      const messageCountResult = await env.DB.prepare<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM conversations 
         WHERE user_id = ? AND character_id = ? AND is_guest_message = 0`
      )
        .bind(user.id, characterId)
        .first();

      const messageCount = messageCountResult?.count || 0;
      const REGISTERED_USER_MESSAGE_LIMIT = REGISTERED_USER_HISTORY_CONFIG.maxStoredMessages; // 登録ユーザーは最新10通のみ保存

      // 【重要】メモリー消費を削減するため、既存の会話履歴も圧縮
      if (REGISTERED_USER_HISTORY_CONFIG.compression.enabled) {
        // 最新10通の会話履歴を取得して、圧縮処理を実行
        const existingHistory = await env.DB.prepare<ConversationRow>(
          `SELECT id, role, message
           FROM conversations
           WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
           ORDER BY COALESCE(timestamp, created_at) DESC
           LIMIT ?`
        )
          .bind(user.id, characterId, REGISTERED_USER_MESSAGE_LIMIT)
          .all();

        // 既存の会話履歴を圧縮
        if (existingHistory.results && existingHistory.results.length > 0) {
          for (const row of existingHistory.results) {
            const maxLength = row.role === 'user' 
              ? REGISTERED_USER_HISTORY_CONFIG.compression.userMessageMaxLength
              : REGISTERED_USER_HISTORY_CONFIG.compression.assistantMessageMaxLength;
            const compressedMessage = compressMessage(row.message, maxLength);
            
            // 圧縮されたメッセージが元のメッセージと異なる場合のみ更新
            if (compressedMessage !== row.message) {
              try {
                await env.DB.prepare(
                  `UPDATE conversations 
                   SET message = ? 
                   WHERE id = ?`
                )
                  .bind(compressedMessage, row.id)
                  .run();
              } catch (error) {
                console.error('会話履歴の圧縮エラー:', error);
              }
            }
          }
        }
      }

      // 10通を超える場合は、古いメッセージを削除
      if (messageCount >= REGISTERED_USER_MESSAGE_LIMIT) {
        // 削除前に、100通までの会話内容からプロフィール情報を抽出
        // まず、100通までの会話履歴を取得（プロフィール抽出用）
        const maxMessagesForProfile = REGISTERED_USER_HISTORY_CONFIG.profileExtraction.maxMessagesForProfile;
        const historyForProfile = await env.DB.prepare<ConversationRow>(
          `SELECT role, message, COALESCE(timestamp, created_at) as timestamp
           FROM conversations
           WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
           ORDER BY COALESCE(timestamp, created_at) DESC
           LIMIT ?`
        )
          .bind(user.id, characterId, maxMessagesForProfile)
          .all();

        // プロフィール情報を抽出（会話の要約や特徴）
        if (historyForProfile.results && historyForProfile.results.length > 0) {
          const profileMessages = historyForProfile.results
            .slice()
            .reverse()
            .map(row => `${row.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${row.message}`)
            .join('\n');
          
          // プロフィール情報を要約（簡易版：実際にはLLMで要約するのが理想）
          // メモリー消費を削減するため、プロフィール情報も圧縮
          const profileSummary = REGISTERED_USER_HISTORY_CONFIG.compression.enabled
            ? `過去の会話内容（${historyForProfile.results.length}通）:\n${compressMessage(profileMessages, REGISTERED_USER_HISTORY_CONFIG.compression.profileMaxLength)}`
            : `過去の会話内容（${historyForProfile.results.length}通）:\n${profileMessages.substring(0, 2000)}...`;
          
          // usersテーブルにプロフィール情報を保存（conversation_profileカラム）
          // 注意: conversation_profileカラムが存在しない場合は、エラーを無視
          try {
            await env.DB.prepare(
              `UPDATE users 
               SET conversation_profile = ? 
               WHERE id = ?`
            )
              .bind(profileSummary, user.id)
              .run();
          } catch (error) {
            // conversation_profileカラムが存在しない場合は無視
            console.log('⚠️ conversation_profileカラムが存在しないため、プロフィール情報の保存をスキップしました');
          }
        }

        // 10通を超える古いメッセージを削除
        const deleteCount = messageCount - REGISTERED_USER_MESSAGE_LIMIT + 2; // ユーザーとアシスタントの2件を追加するため
        await env.DB.prepare(
          `DELETE FROM conversations
           WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
           AND id IN (
             SELECT id FROM conversations
             WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
             ORDER BY COALESCE(timestamp, created_at) ASC
             LIMIT ?
           )`
        )
          .bind(user.id, characterId, user.id, characterId, deleteCount)
          .run();
        
        if (DEBUG_MODE) {
          console.log(`✅ 登録ユーザーの会話履歴を整理: ${messageCount}通 → ${REGISTERED_USER_MESSAGE_LIMIT}通（${deleteCount}通を削除）`);
        }
      }

      // 【重要】メモリー消費を削減するため、会話履歴を圧縮して保存
      // 完全なメッセージではなく、要約やキーポイントを保存
      
      // ユーザーメッセージを圧縮（長いメッセージは要約）
      const compressedUserMessage = REGISTERED_USER_HISTORY_CONFIG.compression.enabled
        ? compressMessage(trimmedMessage, REGISTERED_USER_HISTORY_CONFIG.compression.userMessageMaxLength)
        : trimmedMessage;
      
      // アシスタントメッセージを圧縮（長いメッセージは要約）
      const compressedAssistantMessage = REGISTERED_USER_HISTORY_CONFIG.compression.enabled
        ? compressMessage(responseMessage, REGISTERED_USER_HISTORY_CONFIG.compression.assistantMessageMaxLength)
        : responseMessage;
      
      // ユーザーメッセージを追加（圧縮版）
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, compressedUserMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, compressedUserMessage)
          .run();
      }

      // アシスタントメッセージを追加（圧縮版）
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, compressedAssistantMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, compressedAssistantMessage)
          .run();
      }
    } else {
      // 【重要】ゲストユーザーの場合: user_id = 0 でメッセージを保存
      // 各鑑定士につき最大10通まで（ユーザーメッセージのみ）
      // 10通を超える場合は、古いメッセージを削除
      
      const GUEST_USER_ID = 0; // ゲストユーザーのuser_id
      
      // 現在のユーザーメッセージ数を確認（この鑑定士に対して）
      const guestMessageCountResult = await env.DB.prepare<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM conversations 
         WHERE user_id = ? AND character_id = ? AND is_guest_message = 1 AND role = 'user'`
      )
        .bind(GUEST_USER_ID, characterId)
        .first();

      const guestMessageCount = guestMessageCountResult?.count || 0;
      
      // 10通を超える場合は、古いメッセージを削除（ユーザーメッセージのみ）
      if (guestMessageCount >= GUEST_MESSAGE_LIMIT) {
        // 古いメッセージを削除（ユーザーメッセージとアシスタントメッセージをペアで削除）
        // 最も古いペアから順に削除
        const deleteCount = guestMessageCount - GUEST_MESSAGE_LIMIT + 1; // 今回のメッセージを含めて10通になるように
        
        if (deleteCount > 0) {
          // 削除するメッセージのIDを取得（最も古いものから）
          const messagesToDelete = await env.DB.prepare<{ id: number }>(
            `SELECT id 
             FROM conversations 
             WHERE user_id = ? AND character_id = ? AND is_guest_message = 1
             ORDER BY COALESCE(timestamp, created_at) ASC
             LIMIT ?`
          )
            .bind(GUEST_USER_ID, characterId, deleteCount * 2) // ユーザーとアシスタントのペアなので2倍
            .all();

          if (messagesToDelete.results && messagesToDelete.results.length > 0) {
            const idsToDelete = messagesToDelete.results.map(row => row.id);
            
            // 古いメッセージを削除
            await env.DB.prepare(
              `DELETE FROM conversations 
               WHERE id IN (${idsToDelete.map(() => '?').join(',')})`
            )
              .bind(...idsToDelete)
              .run();
            
            if (DEBUG_MODE) {
              console.log(`✅ ゲストユーザーの会話履歴を整理: ${guestMessageCount}通 → ${GUEST_MESSAGE_LIMIT}通（${idsToDelete.length}通を削除）`);
            }
          }
        }
      }
      
      // ユーザーメッセージを追加
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'user', ?, 'normal', 1, CURRENT_TIMESTAMP)`
        )
          .bind(GUEST_USER_ID, characterId, trimmedMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'user', ?, 'normal', 1, CURRENT_TIMESTAMP)`
        )
          .bind(GUEST_USER_ID, characterId, trimmedMessage)
          .run();
      }

      // アシスタントメッセージを追加
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'assistant', ?, 'normal', 1, CURRENT_TIMESTAMP)`
        )
          .bind(GUEST_USER_ID, characterId, responseMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'assistant', ?, 'normal', 1, CURRENT_TIMESTAMP)`
        )
          .bind(GUEST_USER_ID, characterId, responseMessage)
          .run();
      }
    }

    return new Response(
      JSON.stringify({
        message: responseMessage,
        character: characterId,
        characterName,
        isInappropriate: false,
        detectedKeywords: [],
        registrationSuggested: shouldEncourageRegistration,
        guestMode: !user,
        remainingGuestMessages: user
          ? undefined
          : Math.max(0, GUEST_MESSAGE_LIMIT - (sanitizedGuestCount + 1)),
        showTarotCard: showTarotCard,
        provider: llmResult.provider, // 使用したLLMプロバイダーを返す（デバッグ用）
        assignedDeity: extractedDeity || undefined, // 守護神の儀式完了時に抽出した守護神名を返す
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    // エラーハンドリング
    console.error('Error in consult endpoint:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        character: '',
        characterName: '',
        isInappropriate: false,
        detectedKeywords: []
      } as ResponseBody),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};

