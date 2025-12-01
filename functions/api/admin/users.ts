import { isAdminAuthorized, unauthorizedResponse } from '../../lib/admin-auth.mjs';

const jsonHeaders = { 'Content-Type': 'application/json' };

interface UpdateBody {
  id?: number;
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string;
}

export const onRequest: PagesFunction = async ({ request, env }) => {
  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  if (request.method === 'GET') {
    const users = await env.DB.prepare<{
      id: number;
      nickname: string;
      birth_year: number;
      birth_month: number;
      birth_day: number;
      assigned_deity: string;
      created_at: string;
    }>(
      `SELECT id, nickname, birth_year, birth_month, birth_day, assigned_deity, created_at
       FROM users
       ORDER BY created_at DESC`
    ).all();

    return new Response(JSON.stringify({ users: users.results ?? [] }), { status: 200, headers: jsonHeaders });
  }

  if (request.method === 'PUT') {
    let body: UpdateBody;
    try {
      body = (await request.json()) as UpdateBody;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });
    }

    const { id, nickname, birthYear, birthMonth, birthDay, assignedDeity } = body;
    if (!id || !nickname || !birthYear || !birthMonth || !birthDay || !assignedDeity) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400, headers: jsonHeaders });
    }

    await env.DB.prepare(
      `UPDATE users
       SET nickname = ?, birth_year = ?, birth_month = ?, birth_day = ?, assigned_deity = ?
       WHERE id = ?`
    )
      .bind(nickname.trim(), birthYear, birthMonth, birthDay, assignedDeity.trim(), id)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  }

  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('id');
    if (!userIdParam) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: jsonHeaders });
    }
    const userId = Number(userIdParam);
    if (!Number.isFinite(userId)) {
      return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: jsonHeaders });
    }

    await env.DB.prepare('DELETE FROM conversations WHERE user_id = ?').bind(userId).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
};



