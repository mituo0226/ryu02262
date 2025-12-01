import { getRandomDeity } from '../../../lib/deities.mjs';
import { generateUserToken } from '../../../lib/token.mjs';

interface RegisterRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

interface RegisterResponseBody {
  userToken: string;
  assignedDeity: string;
  nickname: string;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: RegisterRequestBody;
  try {
    body = (await request.json()) as RegisterRequestBody;
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
    return new Response(JSON.stringify({ error: 'birth date is required' }), { status: 400, headers });
  }

  const trimmedNickname = nickname.trim();
  if (!trimmedNickname) {
    return new Response(JSON.stringify({ error: 'nickname cannot be empty' }), { status: 400, headers });
  }

  const existingUser = await env.DB.prepare<{ id: number }>(
    'SELECT id FROM users WHERE nickname = ?'
  )
    .bind(trimmedNickname)
    .first();

  if (existingUser) {
    return new Response(JSON.stringify({ error: 'このニックネームは既に使用されています。' }), {
      status: 409,
      headers,
    });
  }

  const assignedDeity = getRandomDeity();

  const insertResult: any = await env.DB.prepare(
    `INSERT INTO users (nickname, birth_year, birth_month, birth_day, assigned_deity)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(trimmedNickname, birthYear, birthMonth, birthDay, assignedDeity)
    .run();

  const userId = insertResult?.meta?.last_row_id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'ユーザー登録に失敗しました。' }), { status: 500, headers });
  }

  const userToken = await generateUserToken(userId, env.AUTH_SECRET);

  const responseBody: RegisterResponseBody = {
    userToken,
    assignedDeity,
    nickname: trimmedNickname,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
};




