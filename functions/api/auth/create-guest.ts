// 【新仕様】passphraseは使用しないため、getRandomDeityのインポートは不要
// import { getRandomDeity } from '../../_lib/deities.js';

interface CreateGuestRequestBody {
  nickname: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  gender?: string; // オプショナル（回答しない含む）
}

interface CreateGuestResponseBody {
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

  const { nickname, birthYear, birthMonth, birthDay, gender } = body;

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


  // ニックネームの一意化処理
  const uniqueNickname = await ensureUniqueNickname(env.DB, trimmedNickname);

  // 【新仕様】passphraseは使用しないが、NOT NULL制約があるため空文字列を設定
  // 実際の認証には使用されない
  const passphrase = '';


  // ユーザーを作成
  // 【新仕様】以下のカラムは無効化（使用しない）:
  // - passphrase: 使用しないが、NOT NULL制約があるため空文字列を設定
  // userTokenは不要
  // 二重登録チェック: 現時点では無視（将来的にマジックリンクで対応予定）
  const result = await env.DB.prepare(
    `INSERT INTO users (
      nickname,
      birth_year,
      birth_month,
      birth_day,
      passphrase,
      last_activity_at,
      gender
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`
  )
    .bind(uniqueNickname, birthYear, birthMonth, birthDay, passphrase, gender || null)
    .run();

  const userId = result.meta?.last_row_id;
  if (!userId || typeof userId !== 'number') {
    console.error('[create-guest] last_row_id is invalid:', userId, typeof userId);
    return new Response(JSON.stringify({ error: 'Failed to create guest user' }), { status: 500, headers });
  }

  console.log('[create-guest] ユーザーを作成しました:', {
    userId,
    nickname: uniqueNickname,
    birthYear,
    birthMonth,
    birthDay,
    gender: gender || '未回答',
  });

  const responseBody: CreateGuestResponseBody = {
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
