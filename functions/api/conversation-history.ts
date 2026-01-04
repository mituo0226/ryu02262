// Cloudflare Pages Functions の型定義
import { verifyUserToken } from '../_lib/token.js';

interface ConversationRow {
  role: 'user' | 'assistant';
  message?: string; // 後方互換性のため残す（実際はcontentを使用）
  content?: string; // 実際のカラム名
  created_at: string;
}

interface UserRecord {
  id: number;
  nickname: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  guardian: string;
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
    created_at?: string;
  }>;
  error?: string;
  clearChat?: boolean; // チャットクリア指示フラグ（APIからの指示）
  firstQuestion?: string; // 最初の質問（儀式完了後の定型文で使用）
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

    // ===== 登録ユーザーの会話履歴取得 =====
    // 【ポジティブな指定】登録ユーザーは以下の条件を満たす：
    // 1. usersテーブルに存在するID（user_id）を持つ
    // 2. user_type = 'registered'である
    // 3. ニックネーム（nickname）を所持している
    // 4. userTokenで認証されている
    // 
    // 【重要】統一ユーザーテーブル設計により、すべてのユーザーはusersテーブルで管理される
    // 登録ユーザーの履歴は、usersテーブルに存在し、user_type = 'registered'かつnicknameを持つuser_idのみを対象とする
    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT c.role, c.message as content, COALESCE(c.timestamp, c.created_at) as created_at
       FROM conversations c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ? AND c.character_id = ? AND u.user_type = 'registered' AND u.nickname IS NOT NULL
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(user.id, characterId)
      .all();

    const conversations = historyResults.results || [];

    // 儀式完了後の判定：guardianが設定されている場合
    // 儀式完了後は、APIの指示によりチャットをクリアし、会話はゼロからスタート
    const isAfterRitual = !!user.guardian;

    if (conversations.length === 0) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          nickname: user.nickname,
          birthYear: user.birth_year,
          birthMonth: user.birth_month,
          birthDay: user.birth_day,
          assignedDeity: user.guardian,
          clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
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

    // 最近のメッセージを返す（最新10件、created_atも含める）
    const recentMessages = sortedConversations.slice(-10).map((row) => ({
      role: row.role,
      content: row.content || row.message || '', // contentを優先、後方互換性のためmessageも確認
      created_at: row.created_at,
    }));

    // 会話の要約を生成（最後の数件のメッセージから）
    const lastMessages = sortedConversations.slice(-6);
    const conversationText = lastMessages
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : '鑑定士'}: ${msg.message}`)
      .join('\n');

    // 今日の最初のユーザーメッセージを取得（儀式完了後の定型文で使用）
    let firstQuestion: string | undefined = undefined;
    if (isAfterRitual) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const todayMessages = sortedConversations.filter((msg) => {
        if (msg.role !== 'user') return false;
        if (!msg.created_at) return false;
        return msg.created_at.startsWith(todayStr);
      });
      if (todayMessages.length > 0) {
        firstQuestion = todayMessages[0].message;
        console.log('[conversation-history] 今日のfirstQuestion取得:', {
          message: firstQuestion.substring(0, 50) + '...',
          created_at: todayMessages[0].created_at,
          todayStr: todayStr,
          totalTodayUserMessages: todayMessages.length,
          totalUserMessages: sortedConversations.filter(m => m.role === 'user').length
        });
      } else {
        console.log('[conversation-history] 今日のfirstQuestion取得失敗:', {
          todayStr: todayStr,
          totalUserMessages: sortedConversations.filter(m => m.role === 'user').length,
          allDates: sortedConversations.filter(m => m.role === 'user').map(m => m.created_at).slice(0, 5)
        });
      }
    }

    return new Response(
      JSON.stringify({
        hasHistory: true,
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.guardian, // guardianカラムから取得
        lastConversationDate,
        recentMessages,
        conversationSummary: conversationText,
        clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
        firstQuestion: firstQuestion, // 最初の質問（儀式完了後の定型文で使用）
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





