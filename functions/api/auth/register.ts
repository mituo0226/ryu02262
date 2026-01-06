interface RegisterRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  sessionId?: string; // session_idで二重登録をチェック
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

    // session_idで二重登録をチェック
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required.' }),
        { status: 400, headers }
      );
    }

    // 既存ユーザーを検索（session_idで）
    // 【新仕様】create-guest.tsで既にユーザーが作成されているため、
    // register.tsは既存ユーザーを確認し、存在すれば成功レスポンスを返す
    const existingUser = await env.DB.prepare<{ id: number; nickname: string }>(
      'SELECT id, nickname FROM users WHERE session_id = ?'
    )
      .bind(sessionId)
      .first();

    if (!existingUser) {
      // ユーザーが見つからない場合はエラー（create-guest.tsで先に作成されるべき）
      return new Response(
        JSON.stringify({ 
          error: 'ユーザー情報が見つかりませんでした。入口フォームでユーザーを作成してください。' 
        }),
        { status: 404, headers }
      );
    }

    // 既存ユーザーが見つかった場合、成功レスポンスを返す
    // create-guest.tsで既にユーザーが作成されているため、追加の処理は不要
    const responseBody: RegisterResponseBody = {
      nickname: existingUser.nickname,
      message: '登録が完了しました。',
    };

    return new Response(JSON.stringify(responseBody), { status: 200, headers });
  } catch (error) {
    console.error('[register] 予期しないエラー:', error);
    return new Response(
      JSON.stringify({ error: 'ユーザー登録中にエラーが発生しました。' }),
      { status: 500, headers }
    );
  }
};
