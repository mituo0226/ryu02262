import { getRandomDeity } from '../../../lib/deities.mjs';
import { generateUserToken } from '../../../lib/token.mjs';

interface ResetRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

interface ResetResponseBody {
  userToken: string;
  nickname: string;
  assignedDeity: string;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    if (!env.AUTH_SECRET) {
      return new Response(
        JSON.stringify({ error: 'サーバー設定エラー: AUTH_SECRET が未設定です。' }),
        { status: 500, headers }
      );
    }

    let body: ResetRequestBody;
    try {
      body = (await request.json()) as ResetRequestBody;
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

    const user = await env.DB.prepare<{ id: number }>(
      `SELECT id FROM users
       WHERE nickname = ?
         AND birth_year = ?
         AND birth_month = ?
         AND birth_day = ?`
    )
      .bind(trimmedNickname, birthYear, birthMonth, birthDay)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: '入力された情報が一致しません。' }),
        { status: 404, headers }
      );
    }

    const newPassphrase = getRandomDeity();

    await env.DB.prepare(
      `UPDATE users
       SET assigned_deity = ?
       WHERE id = ?`
    )
      .bind(newPassphrase, user.id)
      .run();

    const userToken = await generateUserToken(user.id, env.AUTH_SECRET);

    const responseBody: ResetResponseBody = {
      userToken,
      nickname: trimmedNickname,
      assignedDeity: newPassphrase,
    };

    return new Response(JSON.stringify(responseBody), { status: 200, headers });
  } catch (error) {
    console.error('Error in reset-passphrase endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
};





