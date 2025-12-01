// Cloudflare Pages Functions の型定義
import { verifyUserToken } from '../lib/token.mjs';

interface LastConversationRow {
  character_id: string;
  last_conversation_date: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  assigned_deity: string;
}

interface ResponseBody {
  lastConversations: Record<string, string | null>; // character_id -> last_conversation_date (ISO string) or null
  nickname?: string;
  error?: string;
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
    const userToken = url.searchParams.get('userToken');

    if (!userToken) {
      return new Response(
        JSON.stringify({
          lastConversations: {},
          error: 'userToken is required',
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const tokenPayload = await verifyUserToken(userToken, env.AUTH_SECRET);
    if (!tokenPayload) {
      return new Response(
        JSON.stringify({
          lastConversations: {},
          error: 'invalid user token',
        } as ResponseBody),
        { status: 401, headers: corsHeaders }
      );
    }

    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, assigned_deity FROM users WHERE id = ?'
    )
      .bind(tokenPayload.userId)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({
          lastConversations: {},
          error: 'user not found',
        } as ResponseBody),
        { status: 404, headers: corsHeaders }
      );
    }

    // 各キャラクターとの最後の会話日時を取得
    // timestampカラムが存在しない場合はcreated_atを使用
    const lastConversationsResult = await env.DB.prepare<LastConversationRow>(
      `SELECT character_id, MAX(COALESCE(timestamp, created_at)) as last_conversation_date
       FROM conversations
       WHERE user_id = ?
       GROUP BY character_id`
    )
      .bind(user.id)
      .all();

    const lastConversations: Record<string, string | null> = {
      kaede: null,
      yukino: null,
      sora: null,
      kaon: null,
    };

    if (lastConversationsResult.results) {
      for (const row of lastConversationsResult.results) {
        if (row.character_id && lastConversations.hasOwnProperty(row.character_id)) {
          lastConversations[row.character_id] = row.last_conversation_date || null;
        }
      }
    }

    return new Response(
      JSON.stringify({
        lastConversations,
        nickname: user.nickname,
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in last-conversations endpoint:', error);
    return new Response(
      JSON.stringify({
        lastConversations: {},
        error: 'Internal server error',
      } as ResponseBody),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};


