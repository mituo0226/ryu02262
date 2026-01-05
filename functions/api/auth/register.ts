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
  nickname: string;
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

    // 【重要】ゲストユーザーから登録ユーザーへの移行
    // ゲストユーザーが初めてチャットに参加した時点で既にusersテーブルに保存されているため、
    // 登録時には必ず既存のゲストユーザーレコードが存在する
    // したがって、新規作成ではなく既存のゲストユーザーレコードを更新するのみ
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required. ゲストユーザーとしてチャットに参加した後、登録してください。' }),
        { status: 400, headers }
      );
    }

    // 既存のゲストユーザーを検索
    const guestUser = await env.DB.prepare<{ id: number }>(
      'SELECT id FROM users WHERE session_id = ? AND user_type = ?'
    )
      .bind(sessionId, 'guest')
      .first();

    if (!guestUser) {
      // ゲストユーザーが見つからない場合はエラー
      // ゲストユーザーが初めてチャットに参加した時点で既にusersテーブルに保存されているため、
      // このケースは通常発生しない（データベースエラーやセッションIDの不一致など）
      return new Response(
        JSON.stringify({ 
          error: 'ゲストユーザー情報が見つかりませんでした。チャットに参加してから再度登録してください。' 
        }),
        { status: 404, headers }
      );
    }

    // 既存のゲストユーザーを登録ユーザーに更新
    try {
      await env.DB.prepare(
        `UPDATE users 
         SET user_type = 'registered',
             nickname = ?,
             birth_year = ?,
             birth_month = ?,
             birth_day = ?,
             passphrase = ?
         WHERE id = ? AND user_type = 'guest'`
      )
        .bind(trimmedNickname, birthYear, birthMonth, birthDay, passphrase, guestUser.id)
        .run();
    } catch (error) {
      console.error('[register] UPDATEエラー:', error);
      return new Response(
        JSON.stringify({ error: 'ユーザー情報の更新に失敗しました。' }),
        { status: 500, headers }
      );
    }
    
    userId = guestUser.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'ユーザー登録に失敗しました。' }), { status: 500, headers });
    }

    let userToken: string;
    try {
      userToken = await generateUserToken(userId, env.AUTH_SECRET);
    } catch (error) {
      console.error('[register] トークン生成エラー:', error);
      return new Response(
        JSON.stringify({ error: '認証トークンの生成に失敗しました。' }),
        { status: 500, headers }
      );
    }

    const responseBody: RegisterResponseBody = {
      userToken,
      nickname: trimmedNickname,
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
