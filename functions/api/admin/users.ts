import { isAdminAuthorized, unauthorizedResponse } from '../../_lib/admin-auth.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

interface UpdateBody {
  id?: number;
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  passphrase?: string;
  guardian?: string;
}

export const onRequest: PagesFunction = async ({ request, env }) => {
  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const userType = url.searchParams.get('userType'); // 'registered', 'guest', or null (all)

    let query = `
      SELECT 
        u.id,
        u.nickname,
        u.birth_year,
        u.birth_month,
        u.birth_day,
        u.passphrase,
        u.guardian,
        u.created_at,
        u.user_type,
        u.ip_address,
        u.session_id,
        u.last_activity_at,
        COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id
    `;

    const params: any[] = [];
    if (userType === 'registered' || userType === 'guest') {
      query += ` WHERE u.user_type = ?`;
      params.push(userType);
    }

    query += ` GROUP BY u.id, u.nickname, u.birth_year, u.birth_month, u.birth_day, u.passphrase, u.guardian, u.created_at, u.user_type, u.ip_address, u.session_id, u.last_activity_at
               ORDER BY u.created_at DESC`;

    const users = await env.DB.prepare<{
      id: number;
      nickname: string | null;
      birth_year: number | null;
      birth_month: number | null;
      birth_day: number | null;
      passphrase: string | null;
      guardian: string | null;
      created_at: string;
      user_type: string;
      ip_address: string | null;
      session_id: string | null;
      last_activity_at: string | null;
      message_count: number;
    }>(query).bind(...params).all();

    return new Response(JSON.stringify({ users: users.results ?? [] }), { status: 200, headers: jsonHeaders });
  }

  if (request.method === 'PUT') {
    let body: UpdateBody;
    try {
      body = (await request.json()) as UpdateBody;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });
    }

    const { id, nickname, birthYear, birthMonth, birthDay, passphrase, guardian } = body;
    if (!id || !nickname || !birthYear || !birthMonth || !birthDay || !passphrase) {
      return new Response(JSON.stringify({ error: 'All fields except guardian are required' }), { status: 400, headers: jsonHeaders });
    }

    await env.DB.prepare(
      `UPDATE users
       SET nickname = ?, birth_year = ?, birth_month = ?, birth_day = ?, passphrase = ?, guardian = ?
       WHERE id = ?`
    )
      .bind(nickname.trim(), birthYear, birthMonth, birthDay, passphrase.trim(), guardian?.trim() || null, id)
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





