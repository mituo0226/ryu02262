import { verifyUserToken } from '../../_lib/token.js';

interface UpdateDeityRequestBody {
  guardian: string;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  // 認証チェック
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '認証が必要です' }), { status: 401, headers });
  }

  const token = authHeader.substring(7);
  const tokenData = await verifyUserToken(token, env.AUTH_SECRET);
  if (!tokenData) {
    return new Response(JSON.stringify({ error: '無効なトークンです' }), { status: 401, headers });
  }

  const userId = tokenData.userId;

  let body: UpdateDeityRequestBody;
  try {
    body = (await request.json()) as UpdateDeityRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { guardian } = body;
  if (!guardian || typeof guardian !== 'string') {
    return new Response(JSON.stringify({ error: 'guardian is required' }), { status: 400, headers });
  }

  const trimmedGuardian = guardian.trim();
  if (!trimmedGuardian) {
    return new Response(JSON.stringify({ error: 'guardian cannot be empty' }), { status: 400, headers });
  }

  // ユーザー情報を更新
  await env.DB.prepare(
    `UPDATE users
     SET guardian = ?
     WHERE id = ?`
  )
    .bind(trimmedGuardian, userId)
    .run();

  return new Response(JSON.stringify({ success: true, guardian: trimmedGuardian }), { status: 200, headers });
};


