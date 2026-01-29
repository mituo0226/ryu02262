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

interface TestUserBody {
  action: 'create_or_get';
}

export const onRequest: PagesFunction = async ({ request, env }) => {
  // GETリクエスト（管理画面の初期ロード）では認可をスキップして、クライアントIPのみ返す
  if (request.method === 'GET') {
    const query = `
      SELECT 
        u.id,
        u.nickname,
        u.birth_year,
        u.birth_month,
        u.birth_day,
        u.passphrase,
        u.guardian,
        u.created_at,
        COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id
      GROUP BY u.id, u.nickname, u.birth_year, u.birth_month, u.birth_day, u.passphrase, u.guardian, u.created_at
      ORDER BY u.created_at DESC
    `;

    const users = await env.DB.prepare<{
      id: number;
      nickname: string | null;
      birth_year: number | null;
      birth_month: number | null;
      birth_day: number | null;
      passphrase: string | null;
      guardian: string | null;
      created_at: string;
      message_count: number;
    }>(query).all();

    // クライアントIPを取得
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const xForwardedFor = request.headers.get('x-forwarded-for');
    let clientIp = '127.0.0.1';
    
    if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else if (xForwardedFor) {
      clientIp = xForwardedFor.split(',')[0].trim();
    }

    // 認可チェック（ユーザーデータは認可されたIPのみ返す）
    const isAuthorized = isAdminAuthorized(request, env);
    const usersData = isAuthorized ? (users.results ?? []) : [];

    return new Response(JSON.stringify({ 
      users: usersData,
      clientIp: clientIp,
      authorized: isAuthorized
    }), { status: 200, headers: jsonHeaders });
  }

  // その他のメソッドは認可必須
  if (!isAdminAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  // テスト用ユーザー作成・取得エンドポイント
  if (request.method === 'POST') {
    let body: TestUserBody;
    try {
      body = (await request.json()) as TestUserBody;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });
    }

    if (body.action === 'create_or_get') {
      // テスト用ユーザーが存在するか確認
      const existingTestUser = await env.DB.prepare(
        `SELECT id FROM users WHERE nickname = ? LIMIT 1`
      ).bind('【管理テスト用】').first<{ id: number }>();

      let testUserId: number;

      if (existingTestUser) {
        // 既存のテスト用ユーザーを使用
        testUserId = existingTestUser.id;
      } else {
        // 新しいテスト用ユーザーを作成
        const today = new Date();
        const result = await env.DB.prepare(
          `INSERT INTO users (nickname, birth_year, birth_month, birth_day, passphrase, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          '【管理テスト用】',
          2000,
          1,
          1,
          'テスト用パスフレーズ'
        ).run();

        testUserId = result.meta.last_row_id as number;
      }

      return new Response(
        JSON.stringify({
          success: true,
          testUserId,
          nickname: '【管理テスト用】'
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: jsonHeaders });
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





