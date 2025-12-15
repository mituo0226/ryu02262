// Cloudflare Pages Functions の型定義
import { verifyUserToken } from '../_lib/token.js';

interface ConversationRow {
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  guardian: string | null;
}

interface ResponseBody {
  hasHistory: boolean;
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string;
  lastConversationDate?: string; // 最後の会話日時（ISO形式）
  conversationSummary?: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  error?: string;
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
    const userToken = url.searchParams.get('userToken');
    const characterId = url.searchParams.get('character') || 'kaede';

    if (!userToken) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: 'userToken is required',
        } as ResponseBody),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const tokenPayload = await verifyUserToken(userToken, env.AUTH_SECRET);
    if (!tokenPayload) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: 'invalid user token',
        } as ResponseBody),
        { status: 401, headers: corsHeaders }
      );
    }

    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?'
    )
      .bind(tokenPayload.userId)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: 'user not found',
        } as ResponseBody),
        { status: 404, headers: corsHeaders }
      );
    }

    // 会話履歴を取得（最新20件）
    // timestampカラムが存在しない場合はcreated_atを使用
    // テーブルにはmessageカラムが存在するため、messageを使用
    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT role, message, COALESCE(timestamp, created_at) as created_at
       FROM conversations
       WHERE user_id = ? AND character_id = ?
       ORDER BY COALESCE(timestamp, created_at) DESC
       LIMIT 20`
    )
      .bind(user.id, characterId)
      .all();

    const conversations = historyResults.results || [];

    if (conversations.length === 0) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          nickname: user.nickname,
          birthYear: user.birth_year,
          birthMonth: user.birth_month,
          birthDay: user.birth_day,
          guardian: user.guardian,
        } as ResponseBody),
        { status: 200, headers: corsHeaders }
      );
    }

    // 時系列順に並び替え
    const sortedConversations = conversations.slice().reverse();

    // 最後の会話日時を取得（最新のメッセージのtimestamp）
    const lastConversationDate = sortedConversations.length > 0 
      ? sortedConversations[sortedConversations.length - 1].created_at 
      : null;

    // 最近のメッセージを返す（最新10件）
    const recentMessages = sortedConversations.slice(-10).map((row) => ({
      role: row.role,
      content: row.message,
    }));

    // 会話の要約を生成（最後の数件のメッセージから）
    const lastMessages = sortedConversations.slice(-6);
    const conversationText = lastMessages
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : '鑑定士'}: ${msg.message}`)
      .join('\n');

    return new Response(
      JSON.stringify({
        hasHistory: true,
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.assigned_deity,
        lastConversationDate,
        recentMessages,
        conversationSummary: conversationText,
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
        headers: corsHeaders,
      }
    );
  }
};





