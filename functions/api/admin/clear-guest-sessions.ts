import { isAdminAuthorized, unauthorizedResponse } from '../../_lib/admin-auth.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
  'Content-Type': 'application/json',
};

interface ClearRequest {
  userId?: number;
  clearAll?: boolean;
}

interface GuestUser {
  id: number;
  created_at: string;
  last_activity_at: string;
  message_count?: number;
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
    const { userId, clearAll } = body;

    let deletedSessions = 0;
    let deletedMessages = 0;

    if (clearAll) {
      // すべてのユーザーと会話履歴を削除
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
    } else if (userId) {
      // 特定のuserIdのユーザーを削除
      // 会話履歴を削除
      const deleteMessagesResult = await env.DB.prepare(
        'DELETE FROM conversations WHERE user_id = ?'
      )
        .bind(userId)
        .run();
      deletedMessages = deleteMessagesResult.meta.changes || 0;

      // ユーザーを削除
      const deleteUsersResult = await env.DB.prepare(
        `DELETE FROM users WHERE id = ?`
      )
        .bind(userId)
        .run();
      deletedSessions = deleteUsersResult.meta.changes || 0;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'userId or clearAll is required' }),
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
    const userId = url.searchParams.get('userId');
    const characterId = url.searchParams.get('characterId');

    // userIdで検索
    if (userId) {
      const users = await env.DB.prepare<GuestUser & { message_count: number }>(
        `SELECT 
          u.id,
          u.created_at,
          u.last_activity_at,
          COUNT(c.id) as message_count
        FROM users u
        LEFT JOIN conversations c ON c.user_id = u.id
        WHERE u.id = ?
        GROUP BY u.id, u.created_at, u.last_activity_at
        ORDER BY u.created_at DESC`
      )
        .bind(Number(userId))
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
          u.created_at,
          u.last_activity_at,
          COUNT(DISTINCT c.id) as message_count
        FROM users u
        INNER JOIN conversations c ON c.user_id = u.id AND c.character_id = ?
        GROUP BY u.id, u.created_at, u.last_activity_at
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
    const users = await env.DB.prepare<GuestUser & { message_count: number }>(
      `SELECT 
        u.id,
        u.created_at,
        u.last_activity_at,
        COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id
      GROUP BY u.id, u.created_at, u.last_activity_at
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
