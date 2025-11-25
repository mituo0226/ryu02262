// Cloudflare Pages Functions の型定義
import { isInappropriate, generateSystemPrompt, getCharacterName } from '../lib/character-system.js';
import { isValidCharacter } from '../lib/character-loader.js';
import { verifyUserToken } from '../lib/token.js';

const GUEST_MESSAGE_LIMIT = 10;

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
  showTarotCard?: boolean;
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
    const shouldEncourageRegistration = !body.userToken && sanitizedGuestCount >= 8 && sanitizedGuestCount < GUEST_MESSAGE_LIMIT;

    if (guestLimitReached) {
      // 10通目以降は「ユーザー登録をしてください」というメッセージのみ返す
      const characterName = getCharacterName(characterId);
      const registrationMessage = 'これ以上鑑定を続けるには、ユーザー登録が必要です。生年月日とニックネームを教えていただくことで、より深い鑑定ができるようになります。登録ボタンから手続きをお願いします。';
      
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
    const DEBUG_MODE = true;

    let conversationHistory: ClientHistoryEntry[] = [];

    if (user) {
      // ログインユーザーの場合: データベースから履歴を取得
      const historyResults = await env.DB.prepare<ConversationRow>(
        `SELECT role, message
         FROM conversations
         WHERE user_id = ? AND character_id = ?
         ORDER BY COALESCE(timestamp, created_at) DESC
         LIMIT 20`
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
    
    // ゲストユーザーの場合、guestMetadata.messageCount を優先的に使用
    // （履歴が正しく送られていない可能性があるため）
    let userMessageCount: number;
    if (!user && sanitizedGuestCount > 0) {
      // guestMetadata.messageCount は「これまでのメッセージ数」なので、+1 した値が今回のメッセージ数
      const expectedCount = sanitizedGuestCount + 1;
      
      // conversationHistory から計算した値と guestMetadata から計算した値を比較
      // どちらかが明らかに正しい場合はそれを使用、そうでない場合は大きい方を使用
      if (userMessagesInHistory === 0 && expectedCount > 1) {
        // 履歴が全くない場合は guestMetadata を信頼
        userMessageCount = expectedCount;
      } else if (Math.abs(calculatedUserMessageCount - expectedCount) <= 1) {
        // 差が1以内の場合は、conversationHistory を優先
        userMessageCount = calculatedUserMessageCount;
      } else {
        // 差が大きい場合は、大きい方を使用（より多くの情報を含む方）
        userMessageCount = Math.max(calculatedUserMessageCount, expectedCount);
      }
      
      if (DEBUG_MODE) {
        console.log('🔍 DEBUG: Guest userMessageCount calculation', {
          userMessagesInHistory,
          calculatedUserMessageCount,
          sanitizedGuestCount,
          expectedCount,
          finalUserMessageCount: userMessageCount,
        });
      }
    } else {
      // ログインユーザーの場合、conversationHistory から計算した値を使用
      userMessageCount = calculatedUserMessageCount;
    }
    
    // 最終的な userMessageCount を保証（最小値1、NaN や undefined を防ぐ）
    userMessageCount = Math.max(1, Number.isFinite(userMessageCount) ? userMessageCount : 1);

    if (DEBUG_MODE) {
      console.log('🔍 DEBUG: userMessageCount calculation', {
        conversationHistoryLength: conversationHistory.length,
        userMessagesInHistory: userMessagesInHistory,
        calculatedUserMessageCount: calculatedUserMessageCount,
        sanitizedGuestCount: sanitizedGuestCount,
        finalUserMessageCount: userMessageCount,
        conversationHistory: conversationHistory.map(msg => ({ 
          role: msg.role, 
          content: msg.content.substring(0, 50) 
        })),
      });
    }
    
    // userMessageCount が正しく渡されることを保証
    const finalUserMessageCount = Number.isFinite(userMessageCount) && userMessageCount > 0 
      ? userMessageCount 
      : 1;

    const systemPrompt = generateSystemPrompt(characterId, {
      encourageRegistration: shouldEncourageRegistration,
      userNickname: user?.nickname,
      hasPreviousConversation: conversationHistory.length > 0,
      conversationHistoryLength: conversationHistory.length,
      userMessageCount: finalUserMessageCount, // 必ず正しい数値が渡される
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
      });
    }

    // デバッグ: システムプロンプトにニックネームが含まれているか確認
    if (user?.nickname) {
      console.log('System prompt includes nickname:', systemPrompt.includes(user.nickname));
      console.log('Nickname in prompt:', user.nickname);
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
    
    // タロットカード関連のキーワードを検出（笹岡雪乃の場合のみ）
    const tarotKeywords = ['タロット', 'タロットカード', 'カードを', 'カードをめく', 'カードを占', 'カードを引'];
    const showTarotCard = characterId === 'yukino' && tarotKeywords.some(keyword => responseMessage.includes(keyword));

    if (user) {
      // 100件制限チェックと古いメッセージ削除
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

      // ユーザーメッセージを追加
      // テーブルにはmessageカラムが存在するため、messageを使用
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, trimmedMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'user', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, trimmedMessage)
          .run();
      }

      // アシスタントメッセージを追加
      try {
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, responseMessage)
          .run();
      } catch (error) {
        // timestampカラムが存在しない場合はcreated_atのみを使用
        await env.DB.prepare(
          `INSERT INTO conversations (user_id, character_id, role, message, message_type, is_guest_message, created_at)
           VALUES (?, ?, 'assistant', ?, 'normal', 0, CURRENT_TIMESTAMP)`
        )
          .bind(user.id, characterId, responseMessage)
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

