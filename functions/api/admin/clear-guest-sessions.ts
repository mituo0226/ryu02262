import { isAdminAuthorized, unauthorizedResponse } from '../../_lib/admin-auth.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
  'Content-Type': 'application/json',
};

interface ClearRequest {
  sessionId?: string;
  clearAll?: boolean;
  // 【無効化】ipAddressは使用しない（ip_addressカラムが無効化されたため）
}

interface GuestUser {
  id: number;
  session_id: string | null;
  created_at: string;
  last_activity_at: string;
  message_count?: number;
  // 【無効化】ip_addressは使用しない
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  try {
    const body: ClearRequest = await request.json();
    const { sessionId, clearAll } = body;

    let deletedSessions = 0;
    let deletedMessages = 0;

    if (clearAll) {
      // すべてのユーザーと会話履歴を削除
      // 【無効化】user_typeカラムは使用しないため、すべてのユーザーを対象とする
      // まず会話履歴を削除（外部キー制約がないため、明示的に先に削除）
      const deleteMessagesResult = await env.DB.prepare(
        `DELETE FROM conversations`
      ).run();
      deletedMessages = deleteMessagesResult.meta.changes || 0;
      console.log(`[clear-guest-sessions] 全会話履歴削除: ${deletedMessages}件`);

      // 次にユーザーを削除
      const deleteUsersResult = await env.DB.prepare(
        `DELETE FROM users`
      ).run();
      deletedSessions = deleteUsersResult.meta.changes || 0;
      console.log(`[clear-guest-sessions] 全ユーザー削除: ${deletedSessions}件`);
    } else if (sessionId) {
      // 特定のセッションIDのユーザーを削除
      // 【無効化】user_typeカラムは使用しないため、session_idのみで検索
      const user = await env.DB.prepare<{ id: number }>(
        `SELECT id FROM users WHERE session_id = ?`
      )
        .bind(sessionId)
        .first();

      if (user) {
        // 会話履歴を削除
        const deleteMessagesResult = await env.DB.prepare(
          'DELETE FROM conversations WHERE user_id = ?'
        )
          .bind(user.id)
          .run();
        deletedMessages = deleteMessagesResult.meta.changes || 0;

        // ユーザーを削除
        const deleteUsersResult = await env.DB.prepare(
          `DELETE FROM users WHERE session_id = ?`
        )
          .bind(sessionId)
          .run();
        deletedSessions = deleteUsersResult.meta.changes || 0;
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'sessionId or clearAll is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedSessions,
        deletedMessages,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in clear-guest-sessions:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const characterId = url.searchParams.get('characterId');

    // セッションIDで検索
    if (sessionId) {
      const users = await env.DB.prepare<GuestUser & { message_count: number }>(
        `SELECT 
          u.id,
          u.session_id,
          u.created_at,
          u.last_activity_at,
          COUNT(c.id) as message_count
        FROM users u
        LEFT JOIN conversations c ON c.user_id = u.id
        WHERE u.session_id = ?
        GROUP BY u.id, u.session_id, u.created_at, u.last_activity_at
        ORDER BY u.created_at DESC`
      )
        .bind(sessionId)
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          sessions: users.results || [],
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 鑑定師（character_id）で検索
    if (characterId) {
      const validCharacters = ['kaede', 'yukino', 'sora', 'kaon'];
      if (!validCharacters.includes(characterId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid character ID',
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      const users = await env.DB.prepare<GuestUser & { message_count: number }>(
        `SELECT DISTINCT
          u.id,
          u.session_id,
          u.created_at,
          u.last_activity_at,
          COUNT(DISTINCT c.id) as message_count
        FROM users u
        INNER JOIN conversations c ON c.user_id = u.id AND c.character_id = ?
        GROUP BY u.id, u.session_id, u.created_at, u.last_activity_at
        ORDER BY u.created_at DESC
        LIMIT 100`
      )
        .bind(characterId)
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          sessions: users.results || [],
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // すべてのユーザー情報を取得（最新20件）
    // 【無効化】user_typeカラムは使用しないため、すべてのユーザーを対象とする
    const users = await env.DB.prepare<GuestUser & { message_count: number }>(
      `SELECT 
        u.id,
        u.session_id,
        u.created_at,
        u.last_activity_at,
        COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id
      GROUP BY u.id, u.session_id, u.created_at, u.last_activity_at
      ORDER BY u.created_at DESC
      LIMIT 20`
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        sessions: users.results || [],
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in clear-guest-sessions GET:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
