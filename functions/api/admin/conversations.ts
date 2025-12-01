import { isAdminAuthorized, unauthorizedResponse } from '../../lib/admin-auth.mjs';

const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: PagesFunction = async ({ request, env }) => {
  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const userIdParam = url.searchParams.get('userId');

  if (request.method === 'GET') {
    if (!userIdParam) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: jsonHeaders });
    }
    const userId = Number(userIdParam);
    if (!Number.isFinite(userId)) {
      return new Response(JSON.stringify({ error: 'invalid userId' }), { status: 400, headers: jsonHeaders });
    }

    const history = await env.DB.prepare<{
      id: number;
      character_id: string;
      role: string;
      message: string;
      created_at: string;
    }>(
      `SELECT id, character_id, role, message, created_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    )
      .bind(userId)
      .all();

    return new Response(JSON.stringify({ conversations: history.results ?? [] }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
};


