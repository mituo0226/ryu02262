import { generateUserToken } from '../../lib/token.js';

interface LoginRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string;
}

interface LoginResponseBody {
  userToken: string;
  nickname: string;
  assignedDeity: string; // 合言葉（ログイン認証用）
  guardianDeity?: string; // 守護神名（チャット画面表示用）
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { nickname, birthYear, birthMonth, birthDay, assignedDeity } = body;

  if (!nickname || typeof nickname !== 'string') {
    return new Response(JSON.stringify({ error: 'nickname is required' }), { status: 400, headers });
  }
  if (
    typeof birthYear !== 'number' ||
    typeof birthMonth !== 'number' ||
    typeof birthDay !== 'number' ||
    !assignedDeity
  ) {
    return new Response(JSON.stringify({ error: '生年月日と割り当て神様を入力してください。' }), {
      status: 400,
      headers,
    });
  }

  const trimmedNickname = nickname.trim();
  const trimmedDeity = assignedDeity.trim();

  const user = await env.DB.prepare<{
    id: number;
    nickname: string;
    assigned_deity: string;
    guardian_deity?: string;
  }>(
    `SELECT id, nickname, assigned_deity, guardian_deity
     FROM users
     WHERE nickname = ?
       AND birth_year = ?
       AND birth_month = ?
       AND birth_day = ?
       AND assigned_deity = ?`
  )
    .bind(trimmedNickname, birthYear, birthMonth, birthDay, trimmedDeity)
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
    assignedDeity: user.assigned_deity, // 合言葉
    guardianDeity: user.guardian_deity || undefined, // 守護神名
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
};
