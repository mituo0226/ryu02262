interface TestBody {
  nickname: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = (await request.json()) as TestBody;
    
    // env.DB を使用（本来のバインディング名）
    const db = env.DB;
    
    if (!db) {
      return new Response(
        JSON.stringify({ 
          error: 'Database binding env.DB not found',
          message: 'Cloudflare Pages の D1 バインディング設定を確認してください'
        }),
        { status: 500, headers }
      );
    }

    // テスト: ユーザーを挿入
    const result = await db.prepare(
      `INSERT INTO users (nickname, birth_year, birth_month, birth_day, passphrase, last_activity_at, user_type)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'guest')`
    ).bind(
      body.nickname,
      body.birthYear,
      body.birthMonth,
      body.birthDay,
      ''
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        userId: result.meta?.last_row_id,
        message: 'env.DB バインディングでユーザー登録成功'
      }),
      { status: 201, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers }
    );
  }
};
