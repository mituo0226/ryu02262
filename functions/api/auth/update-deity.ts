interface UpdateDeityRequestBody {
  guardian: string;
  sessionId?: string; // 【新仕様】userTokenは不要。session_idで識別する
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: UpdateDeityRequestBody;
  try {
    body = (await request.json()) as UpdateDeityRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { guardian, sessionId } = body;

  // 【新仕様】userTokenは不要。session_idで識別する
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400, headers });
  }

  // session_idからuser_idを解決
  const user = await env.DB.prepare<{ id: number }>(
    'SELECT id FROM users WHERE session_id = ?'
  )
    .bind(sessionId)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: 'ユーザーが見つかりません' }), { status: 404, headers });
  }

  const userId = user.id;

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


