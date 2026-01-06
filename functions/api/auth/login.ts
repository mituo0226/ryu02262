interface LoginRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

interface LoginResponseBody {
  nickname: string;
  guardian: string | null;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { nickname, birthYear, birthMonth, birthDay } = body;

  if (!nickname || typeof nickname !== 'string') {
    return new Response(JSON.stringify({ error: 'nickname is required' }), { status: 400, headers });
  }
  if (
    typeof birthYear !== 'number' ||
    typeof birthMonth !== 'number' ||
    typeof birthDay !== 'number'
  ) {
    return new Response(JSON.stringify({ error: '生年月日を入力してください。' }), {
      status: 400,
      headers,
    });
  }

  const trimmedNickname = nickname.trim();

  // user_typeは削除
  const user = await env.DB.prepare<{
    id: number;
    nickname: string;
    guardian: string | null;
  }>(
    `SELECT id, nickname, guardian
     FROM users
     WHERE nickname = ?
       AND birth_year = ?
       AND birth_month = ?
       AND birth_day = ?`
  )
    .bind(trimmedNickname, birthYear, birthMonth, birthDay)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: '入力された情報が一致しません。' }), {
      status: 401,
      headers,
    });
  }

  // session_idは削除
  const responseBody: LoginResponseBody = {
    nickname: user.nickname,
    guardian: user.guardian,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
};





