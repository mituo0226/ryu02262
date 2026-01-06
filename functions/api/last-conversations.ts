// Cloudflare Pages Functions の型定義

interface LastConversationRow {
  character_id: string;
  last_conversation_date: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  guardian: string | null;
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
    const nickname = url.searchParams.get('nickname');
    const birthYear = url.searchParams.get('birthYear');
    const birthMonth = url.searchParams.get('birthMonth');
    const birthDay = url.searchParams.get('birthDay');

    if (!nickname || !birthYear || !birthMonth || !birthDay) {
      return new Response(
        JSON.stringify({
          lastConversations: {},
          error: 'nickname and birth date are required',
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
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





