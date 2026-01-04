import { isAdminAuthorized, unauthorizedResponse } from '../../_lib/admin-auth.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
  'Content-Type': 'application/json',
};

interface ClearRequest {
  ipAddress?: string;
  sessionId?: string;
  clearAll?: boolean;
}

interface GuestUser {
  id: number;
  session_id: string | null;
  ip_address: string | null;
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
    const { ipAddress, sessionId, clearAll } = body;

    let deletedSessions = 0;
    let deletedMessages = 0;

    if (clearAll) {
      // すべてのゲストユーザーと会話履歴を削除
      // まず会話履歴を削除（外部キー制約がないため、明示的に先に削除）
      const deleteMessagesResult = await env.DB.prepare(
        `DELETE FROM conversations 
         WHERE user_id IN (SELECT id FROM users WHERE user_type = 'guest')`
      ).run();
      deletedMessages = deleteMessagesResult.meta.changes || 0;
      console.log(`[clear-guest-sessions] 全ゲストメッセージ削除: ${deletedMessages}件`);

      // 次にゲストユーザーを削除
      const deleteUsersResult = await env.DB.prepare(
        `DELETE FROM users WHERE user_type = 'guest'`
      ).run();
      deletedSessions = deleteUsersResult.meta.changes || 0;
      console.log(`[clear-guest-sessions] 全ゲストユーザー削除: ${deletedSessions}件`);
    } else if (ipAddress) {
      // 特定のIPアドレスのゲストユーザーを削除
      const users = await env.DB.prepare<{ id: number }>(
        `SELECT id FROM users WHERE ip_address = ? AND user_type = 'guest'`
      )
        .bind(ipAddress)
        .all();

      if (users.results && users.results.length > 0) {
        const userIds = users.results.map((u) => u.id);

        // 会話履歴を削除
        for (const uid of userIds) {
          const deleteResult = await env.DB.prepare(
            'DELETE FROM conversations WHERE user_id = ? AND is_guest_message = 1'
          )
            .bind(uid)
            .run();
          deletedMessages += deleteResult.meta.changes || 0;
        }

        // ゲストユーザーを削除
        const deleteUsersResult = await env.DB.prepare(
          `DELETE FROM users WHERE ip_address = ? AND user_type = 'guest'`
        )
          .bind(ipAddress)
          .run();
        deletedSessions = deleteUsersResult.meta.changes || 0;
      }
    } else if (sessionId) {
      // 特定のセッションIDのゲストユーザーを削除
      const user = await env.DB.prepare<{ id: number }>(
        `SELECT id FROM users WHERE session_id = ? AND user_type = 'guest'`
      )
        .bind(sessionId)
        .first();

      if (user) {
        // 会話履歴を削除
        const deleteMessagesResult = await env.DB.prepare(
          'DELETE FROM conversations WHERE user_id = ? AND is_guest_message = 1'
        )
          .bind(user.id)
          .run();
        deletedMessages = deleteMessagesResult.meta.changes || 0;

        // ゲストユーザーを削除
        const deleteUsersResult = await env.DB.prepare(
          `DELETE FROM users WHERE session_id = ? AND user_type = 'guest'`
        )
          .bind(sessionId)
          .run();
        deletedSessions = deleteUsersResult.meta.changes || 0;
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'ipAddress, sessionId, or clearAll is required' }),
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
    const ipAddress = url.searchParams.get('ipAddress');
    const sessionId = url.searchParams.get('sessionId');
    const characterId = url.searchParams.get('characterId');

    // セッションIDで検索
    if (sessionId) {
      const users = await env.DB.prepare<GuestUser & { message_count: number }>(
        `SELECT 
          u.id,
          u.session_id,
          u.ip_address,
          u.created_at,
          u.last_activity_at,
          COUNT(c.id) as message_count
        FROM users u
        LEFT JOIN conversations c ON c.user_id = u.id AND c.is_guest_message = 1
        WHERE u.session_id = ? AND u.user_type = 'guest'
        GROUP BY u.id, u.session_id, u.ip_address, u.created_at, u.last_activity_at
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

    // IPアドレスで検索
    if (ipAddress) {
      const users = await env.DB.prepare<GuestUser & { message_count: number }>(
        `SELECT 
          u.id,
          u.session_id,
          u.ip_address,
          u.created_at,
          u.last_activity_at,
          COUNT(c.id) as message_count
        FROM users u
        LEFT JOIN conversations c ON c.user_id = u.id AND c.is_guest_message = 1
        WHERE u.ip_address = ? AND u.user_type = 'guest'
        GROUP BY u.id, u.session_id, u.ip_address, u.created_at, u.last_activity_at
        ORDER BY u.created_at DESC`
      )
        .bind(ipAddress)
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
          u.ip_address,
          u.created_at,
          u.last_activity_at,
          COUNT(DISTINCT c.id) as message_count
        FROM users u
        INNER JOIN conversations c ON c.user_id = u.id AND c.is_guest_message = 1 AND c.character_id = ?
        WHERE u.user_type = 'guest'
        GROUP BY u.id, u.session_id, u.ip_address, u.created_at, u.last_activity_at
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

    // すべてのゲストユーザー情報を取得（最新20件）
    const users = await env.DB.prepare<GuestUser & { message_count: number }>(
      `SELECT 
        u.id,
        u.session_id,
        u.ip_address,
        u.created_at,
        u.last_activity_at,
        COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id AND c.is_guest_message = 1
      WHERE u.user_type = 'guest'
      GROUP BY u.id, u.session_id, u.ip_address, u.created_at, u.last_activity_at
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
