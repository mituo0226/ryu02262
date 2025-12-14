import { verifyUserToken } from '../../_lib/token.js';

interface UpdateDeityRequestBody {
  assignedDeity: string;
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

  const { assignedDeity } = body;
  if (!assignedDeity || typeof assignedDeity !== 'string') {
    return new Response(JSON.stringify({ error: 'assignedDeity is required' }), { status: 400, headers });
  }

  const trimmedDeity = assignedDeity.trim();
  if (!trimmedDeity) {
    return new Response(JSON.stringify({ error: 'assignedDeity cannot be empty' }), { status: 400, headers });
  }

  // ユーザー情報を更新
  await env.DB.prepare(
    `UPDATE users
     SET assigned_deity = ?
     WHERE id = ?`
  )
    .bind(trimmedDeity, userId)
    .run();

  return new Response(JSON.stringify({ success: true, assignedDeity: trimmedDeity }), { status: 200, headers });
};
