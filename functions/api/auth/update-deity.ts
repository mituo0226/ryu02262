interface UpdateDeityRequestBody {
  guardian: string;
  userId?: number; // ユーザー識別用（優先）
  nickname?: string; // ユーザー識別用（後方互換性）
  birthYear?: number; // ユーザー識別用（後方互換性）
  birthMonth?: number; // ユーザー識別用（後方互換性）
  birthDay?: number; // ユーザー識別用（後方互換性）
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: UpdateDeityRequestBody;
  try {
    body = (await request.json()) as UpdateDeityRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { guardian, userId, nickname, birthYear, birthMonth, birthDay } = body;

  // userIdを優先的に使用
  let userRecord;
  if (userId && typeof userId === 'number' && userId > 0) {
    userRecord = await env.DB.prepare<{ id: number }>(
      'SELECT id FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();
  } else if (nickname && typeof birthYear === 'number' && typeof birthMonth === 'number' && typeof birthDay === 'number') {
    // userIdがない場合、後方互換性のためnickname + 生年月日を使用
    userRecord = await env.DB.prepare<{ id: number }>(
      'SELECT id FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
    )
      .bind(nickname.trim(), birthYear, birthMonth, birthDay)
      .first();
  } else {
    return new Response(JSON.stringify({ error: 'userId or nickname and birth date are required' }), { status: 400, headers });
  }

  if (!userRecord) {
    return new Response(JSON.stringify({ error: 'ユーザーが見つかりません' }), { status: 404, headers });
  }

  const finalUserId = userRecord.id;

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
    .bind(trimmedGuardian, finalUserId)
    .run();

  return new Response(JSON.stringify({ success: true, guardian: trimmedGuardian }), { status: 200, headers });
};


