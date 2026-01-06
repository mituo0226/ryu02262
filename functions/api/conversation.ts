// Cloudflare Pages Functions
// 会話履歴管理API - メッセージ保存・取得・管理

const MAX_MESSAGES_PER_CHARACTER = 100;

interface ConversationRow {
  id: number;
  user_id: number;
  character_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  message_type: string;
  is_guest_message: number;
  created_at: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  guardian: string | null;
}

interface RequestBody {
  nickname?: string; // ユーザー識別用
  birthYear?: number; // ユーザー識別用
  birthMonth?: number; // ユーザー識別用
  birthDay?: number; // ユーザー識別用
  character: string;
  role: 'user' | 'assistant';
  content: string;
  messageType?: 'normal' | 'system' | 'warning';
  isGuestMessage?: boolean;
}

interface ResponseBody {
  success: boolean;
  messageId?: number;
  message?: string;
  error?: string;
}

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// メッセージ追加（POST）
export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await request.json();

    // バリデーション
    if (!body.character || !body.role || !body.content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'character, role, and content are required',
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['kaede', 'yukino', 'sora', 'kaon'].includes(body.character)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid character_id',
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['user', 'assistant'].includes(body.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid role',
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    let userId: number | null = null;
    if (body.nickname && typeof body.birthYear === 'number' && typeof body.birthMonth === 'number' && typeof body.birthDay === 'number') {
      const user = await env.DB.prepare<{ id: number }>(
        'SELECT id FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
      )
        .bind(body.nickname.trim(), body.birthYear, body.birthMonth, body.birthDay)
        .first();
      
      if (!user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User not found',
          } as ResponseBody),
          { status: 404, headers: corsHeaders }
        );
      }
      userId = user.id;
    } else if (!body.isGuestMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'nickname and birth date are required',
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    // ゲストユーザーの場合は一時的なuser_idを使用（登録後に移行）
    if (body.isGuestMessage && !userId) {
      // ゲストメッセージは別途管理（既存のAuthStateを使用）
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Guest messages should be handled by client-side storage',
        } as ResponseBody),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User ID is required',
        } as ResponseBody),
        { status: 401, headers: corsHeaders }
      );
    }

    // 100件制限チェックと古いメッセージ削除
    const messageCountResult = await env.DB.prepare<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM conversations 
       WHERE user_id = ? AND character_id = ?`
    )
      .bind(userId, body.character)
      .first();

    const messageCount = messageCountResult?.count || 0;

    if (messageCount >= MAX_MESSAGES_PER_CHARACTER) {
      // 古いメッセージを削除（100件を超える分）
      const deleteCount = messageCount - MAX_MESSAGES_PER_CHARACTER + 1;
      await env.DB.prepare(
        `DELETE FROM conversations
         WHERE user_id = ? AND character_id = ?
         AND id IN (
           SELECT id FROM conversations
           WHERE user_id = ? AND character_id = ?
           ORDER BY timestamp ASC
           LIMIT ?
         )`
      )
        .bind(userId, body.character, userId, body.character, deleteCount)
        .run();
    }

    // メッセージを追加
    const messageType = body.messageType || 'normal';
    const isGuestMessage = body.isGuestMessage ? 1 : 0;

    // 【重要】実際のデータベースにはmessageカラムが存在するため、messageカラムを使用
    const result = await env.DB.prepare(
      `INSERT INTO conversations 
       (user_id, character_id, role, message, message_type, is_guest_message, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
      .bind(userId, body.character, body.role, body.content, messageType, isGuestMessage)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.meta.last_row_id,
        message: 'Message saved successfully',
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in conversation POST:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      } as ResponseBody),
      { status: 500, headers: corsHeaders }
    );
  }
};

// 履歴取得（GET）
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const nickname = url.searchParams.get('nickname');
    const birthYear = url.searchParams.get('birthYear');
    const birthMonth = url.searchParams.get('birthMonth');
    const birthDay = url.searchParams.get('birthDay');
    const character = url.searchParams.get('character') || 'kaede';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    if (!nickname || !birthYear || !birthMonth || !birthDay) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'nickname and birth date are required',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // nickname + 生年月日からuser_idを解決
    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
    )
      .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found',
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT 
         id,
         role,
         content,
         timestamp,
         message_type,
         is_guest_message
       FROM conversations
       WHERE user_id = ? AND character_id = ?
       ORDER BY timestamp ASC
       LIMIT ?`
    )
      .bind(user.id, character, limit)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        messages: historyResults.results || [],
        character,
        hasHistory: (historyResults.results?.length || 0) > 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in conversation GET:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};





