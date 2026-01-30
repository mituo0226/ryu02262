// Cloudflare Pages Functions の型定義
interface ResponseBody {
  hasHistory: boolean;
  hasOtherCharacterHistory?: boolean;
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string;
  lastConversationDate?: string;
  conversationSummary?: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
  }>;
  error?: string;
  clearChat?: boolean;
  firstQuestion?: string;
  welcomeMessage?: string | null;
  returningMessage?: string | null;
  visitPattern?: string;
  requireGuardianConsent?: boolean;
}

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const characterId = url.searchParams.get('character') || 'kaede';

    let userId: number | null = null;

    if (userIdParam) {
      const parsedUserId = Number(userIdParam);
      if (Number.isFinite(parsedUserId) && parsedUserId > 0) {
        userId = parsedUserId;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: 'userId is required',
        } as ResponseBody),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // 【重要な修正】
    // すべての判定を /api/consult に任せるため、
    // conversation-history.ts は常に hasHistory: false を返す
    // これにより、フロントエンドは直接 /api/consult を呼び出し、
    // バックエンド側で正確に訪問パターンを判定する
    
    console.log('[conversation-history] 常に hasHistory: false を返します（すべての判定は /api/consult に任せる）:', {
      userId,
      characterId,
    });

    // ユーザー情報を取得
    interface UserRecord {
      id: number;
      nickname: string;
      birth_year: number;
      birth_month: number;
      birth_day: number;
      guardian: string;
    }

    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: 'user not found',
        } as ResponseBody),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    return new Response(
      JSON.stringify({
        hasHistory: false,  // 【重要】常に false を返す
        hasOtherCharacterHistory: false,
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.guardian,
        clearChat: false,
        welcomeMessage: null,
        visitPattern: 'first_visit',  // フロントエンドでの初回判定用（実際の判定は /api/consult で行われる）
      } as ResponseBody),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in conversation-history endpoint:', error);
    return new Response(
      JSON.stringify({
        hasHistory: false,
        error: 'Internal server error',
      } as ResponseBody),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
