interface UpdateDeityRequestBody {
  guardian: string;
  nickname: string; // ユーザー識別用
  birthYear: number; // ユーザー識別用
  birthMonth: number; // ユーザー識別用
  birthDay: number; // ユーザー識別用
  // sessionIdは削除
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: UpdateDeityRequestBody;
  try {
    body = (await request.json()) as UpdateDeityRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { guardian, nickname, birthYear, birthMonth, birthDay } = body;

  if (!nickname || typeof birthYear !== 'number' || typeof birthMonth !== 'number' || typeof birthDay !== 'number') {
    return new Response(JSON.stringify({ error: 'nickname and birth date are required' }), { status: 400, headers });
  }

  // nickname + 生年月日からuser_idを解決
  const user = await env.DB.prepare<{ id: number }>(
    'SELECT id FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
  )
    .bind(nickname.trim(), birthYear, birthMonth, birthDay)
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


