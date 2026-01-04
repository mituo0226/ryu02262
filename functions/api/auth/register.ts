import { getRandomDeity } from '../../_lib/deities.js';
import { generateUserToken } from '../../_lib/token.js';

interface RegisterRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  sessionId?: string; // ゲストユーザーから登録ユーザーへの移行時に使用
}

interface RegisterResponseBody {
  userToken: string;
  passphrase: string;
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

  const { nickname, birthYear, birthMonth, birthDay, sessionId } = body;

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

  // ニックネームの重複チェック
  const existingNickname = await env.DB.prepare<{ id: number }>(
    'SELECT id FROM users WHERE nickname = ? AND user_type = ?'
  )
    .bind(trimmedNickname, 'registered')
    .first();

  if (existingNickname) {
    return new Response(JSON.stringify({ error: 'このニックネームは既に使用されています。' }), {
      status: 409,
      headers,
    });
  }

  const passphrase = getRandomDeity();
  let userId: number;

  // ゲストユーザーから登録ユーザーへの移行
  if (sessionId) {
    // 既存のゲストユーザーを検索
    const guestUser = await env.DB.prepare<{ id: number }>(
      'SELECT id FROM users WHERE session_id = ? AND user_type = ?'
    )
      .bind(sessionId, 'guest')
      .first();

    if (guestUser) {
      // 既存のゲストユーザーを登録ユーザーに更新
      await env.DB.prepare(
        `UPDATE users 
         SET user_type = 'registered',
             nickname = ?,
             birth_year = ?,
             birth_month = ?,
             birth_day = ?,
             passphrase = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_type = 'guest'`
      )
        .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase, guestUser.id)
        .run();
      userId = guestUser.id;
    } else {
      // ゲストユーザーが見つからない場合は新規作成
      const insertResult: any = await env.DB.prepare(
        `INSERT INTO users (user_type, nickname, birth_year, birth_month, birth_day, passphrase)
         VALUES ('registered', ?, ?, ?, ?, ?)`
      )
        .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase)
        .run();
      userId = insertResult?.meta?.last_row_id;
    }
  } else {
    // 新規登録ユーザー
    const insertResult: any = await env.DB.prepare(
      `INSERT INTO users (user_type, nickname, birth_year, birth_month, birth_day, passphrase)
       VALUES ('registered', ?, ?, ?, ?, ?)`
    )
      .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase)
      .run();
    userId = insertResult?.meta?.last_row_id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'ユーザー登録に失敗しました。' }), { status: 500, headers });
  }

  const userToken = await generateUserToken(userId, env.AUTH_SECRET);

  const responseBody: RegisterResponseBody = {
    userToken,
    passphrase,
    nickname: trimmedNickname,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
};




