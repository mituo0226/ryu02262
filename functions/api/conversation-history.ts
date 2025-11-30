// Cloudflare Pages Functions の型定義
import { verifyUserToken } from '../lib/token.js';

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
  assigned_deity: string;
  guardian_deity?: string; // 守護神名（guardian_deityカラム）
  conversation_profile?: string; // 過去100通までの会話内容から抽出したプロフィール情報
}

interface ResponseBody {
  hasHistory: boolean;
  nickname?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  assignedDeity?: string; // 合言葉（ログイン認証用）
  guardianDeity?: string; // 守護神名（チャット画面表示用）
  lastConversationDate?: string; // 最後の会話日時（ISO形式）
  conversationSummary?: string;
  conversationProfile?: string; // 過去100通までの会話内容から抽出したプロフィール情報（圧縮された記憶）
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

    // ユーザー情報を取得（プロフィール情報と守護神名も含む）
    const user = await env.DB.prepare<UserRecord>(
      'SELECT id, nickname, birth_year, birth_month, birth_day, assigned_deity, guardian_deity, conversation_profile FROM users WHERE id = ?'
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

    // 【重要】登録ユーザーの会話履歴は最新10通のみ保存
    // 会話履歴を取得（最新10通のみ）
    // timestampカラムが存在しない場合はcreated_atを使用
    // テーブルにはmessageカラムが存在するため、messageを使用
    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT role, message, COALESCE(timestamp, created_at) as created_at
       FROM conversations
       WHERE user_id = ? AND character_id = ? AND is_guest_message = 0
       ORDER BY COALESCE(timestamp, created_at) DESC
       LIMIT 10`
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
          assignedDeity: user.assigned_deity,
          guardianDeity: user.guardian_deity || undefined,
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

    // 最近のメッセージを返す（最新10通のみ - 既に10通に制限されている）
    const recentMessages = sortedConversations.map((row) => ({
      role: row.role,
      content: row.message,
    }));

    // 会話の要約を生成（最新10通のメッセージから）
    // プロフィール情報がある場合は、それも含める（過去100通までの記憶）
    const conversationText = sortedConversations
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : '鑑定士'}: ${msg.message}`)
      .join('\n');
    
    // プロフィール情報を取得（過去100通までの会話内容から抽出した情報）
    const profileInfo = user.conversation_profile || null;

    return new Response(
      JSON.stringify({
        hasHistory: true,
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.assigned_deity,
        lastConversationDate,
        recentMessages, // 最新10通のみ
        conversationSummary: conversationText, // 最新10通の要約
        conversationProfile: profileInfo, // 過去100通までのプロフィール情報（圧縮された記憶）
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

