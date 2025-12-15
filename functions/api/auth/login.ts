import { generateUserToken } from '../../_lib/token.js';

interface LoginRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  passphrase?: string;
}

interface LoginResponseBody {
  userToken: string;
  nickname: string;
  passphrase: string;
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

  const { nickname, birthYear, birthMonth, birthDay, passphrase } = body;

  if (!nickname || typeof nickname !== 'string') {
    return new Response(JSON.stringify({ error: 'nickname is required' }), { status: 400, headers });
  }
  if (
    typeof birthYear !== 'number' ||
    typeof birthMonth !== 'number' ||
    typeof birthDay !== 'number' ||
    !passphrase
  ) {
    return new Response(JSON.stringify({ error: '生年月日と合言葉を入力してください。' }), {
      status: 400,
      headers,
    });
  }

  const trimmedNickname = nickname.trim();
  const trimmedPassphrase = passphrase.trim();

  const user = await env.DB.prepare<{
    id: number;
    nickname: string;
    passphrase: string;
    guardian: string | null;
  }>(
    `SELECT id, nickname, passphrase, guardian
     FROM users
     WHERE nickname = ?
       AND birth_year = ?
       AND birth_month = ?
       AND birth_day = ?
       AND passphrase = ?`
  )
    .bind(trimmedNickname, birthYear, birthMonth, birthDay, trimmedPassphrase)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: '入力された情報が一致しません。' }), {
      status: 401,
      headers,
    });
  }

  const userToken = await generateUserToken(user.id, env.AUTH_SECRET);

  const responseBody: LoginResponseBody = {
    userToken,
    nickname: user.nickname,
    passphrase: user.passphrase,
    guardian: user.guardian,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
};





