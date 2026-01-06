interface RegisterRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

interface RegisterResponseBody {
  nickname: string;
  message: string;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    let body: RegisterRequestBody;
    try {
      body = (await request.json()) as RegisterRequestBody;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
    }

    const { nickname, birthYear, birthMonth, birthDay, gender } = body;

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

    const existingUser = await env.DB.prepare<{ id: number; nickname: string }>(
      'SELECT id, nickname FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
    )
      .bind(trimmedNickname, birthYear, birthMonth, birthDay)
      .first();

    if (existingUser) {
      // 既存ユーザーが見つかった場合、成功レスポンスを返す
      const responseBody: RegisterResponseBody = {
        nickname: existingUser.nickname,
        message: '登録が完了しました。',
      };
      return new Response(JSON.stringify(responseBody), { status: 200, headers });
    }

    // 既存ユーザーが見つからない場合は、新規ユーザーを作成
    // 【新仕様】passphraseは使用しないが、NOT NULL制約があるため空文字列を設定
    const passphrase = '';
    // user_type: 'guest' - ニックネーム・生年月日・性別のみを登録したユーザー（デフォルト）
    const userType = 'guest';
    
    const result = await env.DB.prepare(
      `INSERT INTO users (
        nickname,
        birth_year,
        birth_month,
        birth_day,
        passphrase,
        last_activity_at,
        gender,
        user_type
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
    )
      .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase, gender || null, userType)
      .run();

    const userId = result.meta?.last_row_id;
    if (!userId || typeof userId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'ユーザー登録に失敗しました。' }),
        { status: 500, headers }
      );
    }

    const responseBody: RegisterResponseBody = {
      nickname: trimmedNickname,
      message: '登録が完了しました。',
    };

    return new Response(JSON.stringify(responseBody), { status: 201, headers });
  } catch (error) {
    console.error('[register] 予期しないエラー:', error);
    return new Response(
      JSON.stringify({ error: 'ユーザー登録中にエラーが発生しました。' }),
      { status: 500, headers }
    );
  }
};
