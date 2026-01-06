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
    const existingUser = await env.DB.prepare<{ id: number; user_type: string }>(
      'SELECT id, user_type FROM users WHERE session_id = ?'
    )
      .bind(sessionId)
      .first();

    if (existingUser) {
      // 既に登録済みの場合はエラー
      return new Response(
        JSON.stringify({ error: '登録済みです。' }),
        { status: 409, headers }
      );
    }

    // ユーザーが見つからない場合はエラー（create-guest.tsで先に作成されるべき）
    return new Response(
      JSON.stringify({ 
        error: 'ユーザー情報が見つかりませんでした。入口フォームでユーザーを作成してください。' 
      }),
      { status: 404, headers }
    );

    // このコードは到達しない（上記でreturnされる）
    // ただし、将来的に登録処理を追加する場合はここに記述
  } catch (error) {
    console.error('[register] 予期しないエラー:', error);
    return new Response(
      JSON.stringify({ error: 'ユーザー登録中にエラーが発生しました。' }),
      { status: 500, headers }
    );
  }
};
