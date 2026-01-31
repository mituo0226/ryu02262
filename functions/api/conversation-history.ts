// Cloudflare Pages Functions の型定義

// ===== 型定義 =====
interface UserRecord {
  id: number;
  nickname: string;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  guardian?: string | null;
}

interface ConversationRecord {
  role: 'user' | 'assistant';
  message: string;
  timestamp?: string;
  created_at: string;
}

interface ResponseData {
  hasHistory: boolean;
  visitPattern: string;
  nickname?: string;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  assignedDeity?: string | null;
  messages?: Array<{ role: string; content: string }>;
}

/**
 * 会話履歴を取得するエンドポイント
 * フロントエンドから呼ばれて、ユーザーが再訪問か初回訪問かを判定
 * @param context - Cloudflare Pages Function context
 * @returns JSON response
 */
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    // クエリパラメータを取得
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const character = url.searchParams.get('character');

    // パラメータの検証
    if (!userIdParam || !character) {
      console.warn('[conversation-history] 必須パラメータが不足しています:', {
        userId: userIdParam,
        character,
      });
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: userId and character',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // userIdを数値に変換
    const userId = Number(userIdParam);
    if (!Number.isFinite(userId) || userId <= 0) {
      console.warn('[conversation-history] 無効なuserId:', userIdParam);
      return new Response(
        JSON.stringify({
          error: 'Invalid userId',
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    console.log('[conversation-history] リクエスト受信:', {
      userId,
      character,
    });

    // ユーザー情報を取得
    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!user) {
      console.log('[conversation-history] ユーザーが見つかりません:', userId);
      return new Response(
        JSON.stringify({
          error: 'User not found',
        }),
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    // 会話履歴を取得（message_type='normal'のメッセージのみ）
    // ウェルカムメッセージ（message_type='welcome'）は履歴判定から除外
    const conversations = await env.DB.prepare<ConversationRecord>(
      `SELECT role, message, timestamp, created_at
       FROM conversations
       WHERE user_id = ? AND character_id = ? AND (message_type = 'normal' OR message_type IS NULL)
       ORDER BY COALESCE(timestamp, created_at) DESC
       LIMIT 1`
    )
      .bind(userId, character)
      .all();

    console.log('[conversation-history] データベース問い合わせ結果:', {
      userId,
      character,
      conversationCount: conversations.results?.length || 0,
      note: 'ウェルカムメッセージ(message_type=welcome)は除外',
    });

    // 履歴の有無を判定（通常メッセージのみ）
    const hasHistory = (conversations.results?.length || 0) > 0;

    // 訪問パターンを判定（シンプル版）
    // 履歴があればreturning、なければfirst_visit
    const visitPattern = hasHistory ? 'returning' : 'first_visit';

    console.log('[conversation-history] 判定結果:', {
      userId,
      character,
      hasHistory,
      visitPattern,
      nickname: user.nickname,
    });

    const response: ResponseData = {
      hasHistory,
      visitPattern,
      nickname: user.nickname,
      birthYear: user.birth_year,
      birthMonth: user.birth_month,
      birthDay: user.birth_day,
      assignedDeity: user.guardian,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[conversation-history] エラー:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
