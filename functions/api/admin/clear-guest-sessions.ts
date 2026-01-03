import { isAdminAuthorized, unauthorizedResponse } from '../../_lib/admin-auth.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Authorization', 'X-Admin-Token',
  'Content-Type': 'application/json',
};

interface ClearRequest {
  ipAddress?: string;
  sessionId?: string;
  clearAll?: boolean;
}

interface GuestSession {
  id: number;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
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
      // すべてのゲストセッションと会話履歴を削除
      const deleteMessagesResult = await env.DB.prepare(
        'DELETE FROM conversations WHERE is_guest_message = 1'
      ).run();
      deletedMessages = deleteMessagesResult.meta.changes || 0;

      const deleteSessionsResult = await env.DB.prepare('DELETE FROM guest_sessions').run();
      deletedSessions = deleteSessionsResult.meta.changes || 0;
    } else if (ipAddress) {
      // 特定のIPアドレスのセッションを削除
      const sessions = await env.DB.prepare<{ id: number }>(
        'SELECT id FROM guest_sessions WHERE ip_address = ?'
      )
        .bind(ipAddress)
        .all();

      if (sessions.results && sessions.results.length > 0) {
        const sessionIds = sessions.results.map((s) => s.id);

        // 会話履歴を削除
        for (const sid of sessionIds) {
          const deleteResult = await env.DB.prepare(
            'DELETE FROM conversations WHERE user_id = ? AND is_guest_message = 1'
          )
            .bind(sid)
            .run();
          deletedMessages += deleteResult.meta.changes || 0;
        }

        // セッションを削除
        const deleteSessionsResult = await env.DB.prepare(
          'DELETE FROM guest_sessions WHERE ip_address = ?'
        )
          .bind(ipAddress)
          .run();
        deletedSessions = deleteSessionsResult.meta.changes || 0;
      }
    } else if (sessionId) {
      // 特定のセッションIDを削除
      const session = await env.DB.prepare<{ id: number }>(
        'SELECT id FROM guest_sessions WHERE session_id = ?'
      )
        .bind(sessionId)
        .first();

      if (session) {
        // 会話履歴を削除
        const deleteMessagesResult = await env.DB.prepare(
          'DELETE FROM conversations WHERE user_id = ? AND is_guest_message = 1'
        )
          .bind(session.id)
          .run();
        deletedMessages = deleteMessagesResult.meta.changes || 0;

        // セッションを削除
        const deleteSessionsResult = await env.DB.prepare(
          'DELETE FROM guest_sessions WHERE session_id = ?'
        )
          .bind(sessionId)
          .run();
        deletedSessions = deleteSessionsResult.meta.changes || 0;
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

    if (ipAddress) {
      // 特定のIPアドレスのセッション情報を取得
      const sessions = await env.DB.prepare<GuestSession & { message_count: number }>(
        `SELECT 
          gs.id,
          gs.session_id,
          gs.ip_address,
          gs.user_agent,
          gs.created_at,
          gs.last_activity_at,
          COUNT(c.id) as message_count
        FROM guest_sessions gs
        LEFT JOIN conversations c ON c.user_id = gs.id AND c.is_guest_message = 1
        WHERE gs.ip_address = ?
        GROUP BY gs.id, gs.session_id, gs.ip_address, gs.user_agent, gs.created_at, gs.last_activity_at
        ORDER BY gs.created_at DESC`
      )
        .bind(ipAddress)
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          sessions: sessions.results || [],
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      // すべてのセッション情報を取得（最新20件）
      const sessions = await env.DB.prepare<GuestSession & { message_count: number }>(
        `SELECT 
          gs.id,
          gs.session_id,
          gs.ip_address,
          gs.user_agent,
          gs.created_at,
          gs.last_activity_at,
          COUNT(c.id) as message_count
        FROM guest_sessions gs
        LEFT JOIN conversations c ON c.user_id = gs.id AND c.is_guest_message = 1
        GROUP BY gs.id, gs.session_id, gs.ip_address, gs.user_agent, gs.created_at, gs.last_activity_at
        ORDER BY gs.created_at DESC
        LIMIT 20`
      ).all();

      return new Response(
        JSON.stringify({
          success: true,
          sessions: sessions.results || [],
        }),
        { status: 200, headers: corsHeaders }
      );
    }
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
