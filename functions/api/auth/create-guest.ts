import { getRandomDeity } from '../../_lib/deities.js';

interface CreateGuestRequestBody {
  nickname: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  gender?: string; // オプショナル（回答しない含む）
  sessionId?: string; // クライアント側から送られてきたsession_id（二重登録防止用）
}

interface CreateGuestResponseBody {
  sessionId: string;
  nickname: string;
}

/**
 * ニックネームの一意化処理
 * 既存のニックネームと競合する場合、末尾に数字を付けて一意化する
 */
async function ensureUniqueNickname(
  db: D1Database,
  baseNickname: string
): Promise<string> {
  // まず、元のニックネームで検索
  const existing = await db
    .prepare<{ id: number }>('SELECT id FROM users WHERE nickname = ?')
    .bind(baseNickname)
    .first();

  if (!existing) {
    // 競合しない場合はそのまま返す
    return baseNickname;
  }

  // 競合する場合、末尾に数字を付けて一意化
  let counter = 1;
  let uniqueNickname = `${baseNickname}${counter}`;

  while (true) {
    const existingWithNumber = await db
      .prepare<{ id: number }>('SELECT id FROM users WHERE nickname = ?')
      .bind(uniqueNickname)
      .first();

    if (!existingWithNumber) {
      // 一意なニックネームが見つかった
      return uniqueNickname;
    }

    counter++;
    uniqueNickname = `${baseNickname}${counter}`;

    // 無限ループ防止（1000回まで試行）
    if (counter > 1000) {
      // タイムスタンプを付けて強制的に一意化
      uniqueNickname = `${baseNickname}_${Date.now()}`;
      break;
    }
  }

  return uniqueNickname;
}

/**
 * UUIDを生成する関数
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  // CORS対応
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  let body: CreateGuestRequestBody;
  try {
    body = (await request.json()) as CreateGuestRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { nickname, birthYear, birthMonth, birthDay, gender, sessionId: providedSessionId } = body;

  // バリデーション
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

  // 生年月日の妥当性チェック
  if (birthYear < 1900 || birthYear > 2100) {
    return new Response(JSON.stringify({ error: 'Invalid birth year' }), { status: 400, headers });
  }
  if (birthMonth < 1 || birthMonth > 12) {
    return new Response(JSON.stringify({ error: 'Invalid birth month' }), { status: 400, headers });
  }
  if (birthDay < 1 || birthDay > 31) {
    return new Response(JSON.stringify({ error: 'Invalid birth day' }), { status: 400, headers });
  }

  // 【二重登録防止】session_idが提供されている場合、既存ユーザーを検索
  if (providedSessionId && typeof providedSessionId === 'string' && providedSessionId.trim()) {
    const existingUser = await env.DB.prepare<{
      id: number;
      nickname: string;
      session_id: string;
    }>('SELECT id, nickname, session_id FROM users WHERE session_id = ?')
      .bind(providedSessionId.trim())
      .first();

    if (existingUser) {
      // 既存ユーザーが見つかった場合、新規作成せずに既存ユーザーを返す（200 OK）
      console.log('[create-guest] 既存のゲストユーザーを返します（二重登録防止）:', {
        userId: existingUser.id,
        sessionId: existingUser.session_id,
        nickname: existingUser.nickname,
      });

      const responseBody: CreateGuestResponseBody = {
        sessionId: existingUser.session_id,
        nickname: existingUser.nickname,
      };

      return new Response(JSON.stringify(responseBody), {
        status: 200, // 200 OK（新規作成ではないが、正常なレスポンス）
        headers: {
          ...headers,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  // ニックネームの一意化処理
  const uniqueNickname = await ensureUniqueNickname(env.DB, trimmedNickname);

  // passphraseを自動生成（users.passphrase NOT NULL制約のため）
  const passphrase = getRandomDeity();

  // session_id（UUID）を生成
  const sessionId = providedSessionId && typeof providedSessionId === 'string' && providedSessionId.trim()
    ? providedSessionId.trim()
    : generateUUID();

  // IPアドレスを取得（オプショナル）
  const ipAddress = request.headers.get('CF-Connecting-IP') || null;

  // ユーザーを作成
  // 【新仕様】user_typeカラムは不要（すべてのユーザーが同じ扱い）
  // session_idで識別し、userTokenは不要
  // 注意: データベースにuser_typeカラムが存在する場合は、デフォルト値として'registered'が設定される
  const result = await env.DB.prepare(
    `INSERT INTO users (
      nickname,
      birth_year,
      birth_month,
      birth_day,
      passphrase,
      session_id,
      ip_address,
      last_activity_at,
      gender
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`
  )
    .bind(uniqueNickname, birthYear, birthMonth, birthDay, passphrase, sessionId, ipAddress, gender || null)
    .run();

  const userId = result.meta?.last_row_id;
  if (!userId || typeof userId !== 'number') {
    console.error('[create-guest] last_row_id is invalid:', userId, typeof userId);
    return new Response(JSON.stringify({ error: 'Failed to create guest user' }), { status: 500, headers });
  }

  console.log('[create-guest] ゲストユーザーを作成しました:', {
    userId,
    sessionId,
    nickname: uniqueNickname,
    birthYear,
    birthMonth,
    birthDay,
    gender: gender || '未回答',
  });

  const responseBody: CreateGuestResponseBody = {
    sessionId,
    nickname: uniqueNickname,
  };

  return new Response(JSON.stringify(responseBody), {
    status: 201, // 201 Created（新規作成）
    headers: {
      ...headers,
      'Access-Control-Allow-Origin': '*',
    },
  });
};
