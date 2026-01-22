interface LoginRequestBody {
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

interface LoginResponseBody {
  userId: number;
  nickname: string;
  guardian: string | null;
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json' };

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
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
    return new Response(JSON.stringify({ error: '生年月日を入力してください。' }), {
      status: 400,
      headers,
    });
  }

  const trimmedNickname = nickname.trim();

  const user = await env.DB.prepare<{
    id: number;
    nickname: string;
    guardian: string | null;
  }>(
    `SELECT id, nickname, guardian
     FROM users
     WHERE nickname = ?
       AND birth_year = ?
       AND birth_month = ?
       AND birth_day = ?`
  )
    .bind(trimmedNickname, birthYear, birthMonth, birthDay)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: '入力された情報が一致しません。' }), {
      status: 401,
      headers,
    });
  }

  const responseBody: LoginResponseBody = {
    userId: user.id,
    nickname: user.nickname,
    guardian: user.guardian,
  };

  // 【修正】セッションCookieを設定してユーザーIDを保持
  // これにより、URLパラメータに依存せずにユーザー情報を引き継げる
  const cookieValue = `userId=${user.id}; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=86400`; // 24時間有効
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a12743d9-c317-4acb-a94d-a526630eb213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.ts:70',message:'ログイン成功: Cookie設定',data:{userId:user.id,nickname:user.nickname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      ...headers,
      'Set-Cookie': cookieValue,
    },
  });
};





