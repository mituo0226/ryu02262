// Cloudflare Pages Functions の型定義
import { isInappropriate, generateSystemPrompt, getCharacterName } from '../lib/character-system.js';
import { isValidCharacter } from '../lib/character-loader.js';
import { verifyUserToken } from '../lib/token.js';

const GUEST_MESSAGE_LIMIT = 5;

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
    // 3通目以降から自然に登録を促す
    const shouldEncourageRegistration = !body.userToken && sanitizedGuestCount >= 3 && sanitizedGuestCount < GUEST_MESSAGE_LIMIT;

    if (guestLimitReached) {
      return new Response(
        JSON.stringify({
          needsRegistration: true,
          error: 'Guest message limit reached',
          message: '',
          character: characterId,
          characterName: '',
          isInappropriate: false,
          detectedKeywords: [],
          guestMode: true,
          remainingGuestMessages: 0,
        } as ResponseBody),
        { status: 401, headers: corsHeaders }
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

    const systemPrompt = generateSystemPrompt(characterId, {
      encourageRegistration: shouldEncourageRegistration,
    });

    let conversationHistory: ClientHistoryEntry[] = [];

    if (user) {
      const historyResults = await env.DB.prepare<ConversationRow>(
        `SELECT role, message
         FROM conversations
         WHERE user_id = ? AND character_id = ?
         ORDER BY created_at DESC
         LIMIT 20`
      )
        .bind(user.id, characterId)
        .all();

      const dbHistory =
        historyResults.results?.slice().reverse().map((row) => ({
          role: row.role,
          content: row.message,
        })) ?? [];

      if (body.migrateHistory && sanitizedHistory.length > 0) {
        for (const entry of sanitizedHistory) {
          await env.DB.prepare(
            `INSERT INTO conversations (user_id, character_id, role, message)
             VALUES (?, ?, ?, ?)`
          )
            .bind(user.id, characterId, entry.role, entry.content)
            .run();
        }
        conversationHistory = [...sanitizedHistory, ...dbHistory];
      } else {
        conversationHistory = dbHistory;
      }
    } else {
      conversationHistory = sanitizedHistory;
    }

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: trimmedMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);

      let errorMessage = 'Failed to get response from DeepSeek API';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // ignore
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: '',
          character: characterId,
          characterName,
          isInappropriate: false,
          detectedKeywords: [],
        } as ResponseBody),
        { status: deepseekResponse.status, headers: corsHeaders }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const responseMessage =
      deepseekData.choices?.[0]?.message?.content || '申し訳ございませんが、応答を生成できませんでした。';

    if (user) {
      await env.DB.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message)
         VALUES (?, ?, 'user', ?)`
      )
        .bind(user.id, characterId, trimmedMessage)
        .run();

      await env.DB.prepare(
        `INSERT INTO conversations (user_id, character_id, role, message)
         VALUES (?, ?, 'assistant', ?)`
      )
        .bind(user.id, characterId, responseMessage)
        .run();

      await env.DB.prepare(
        `DELETE FROM conversations
         WHERE id IN (
           SELECT id FROM conversations
           WHERE user_id = ? AND character_id = ?
           ORDER BY created_at DESC
           LIMIT 100 OFFSET 100
         )`
      )
        .bind(user.id, characterId)
        .run();
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

