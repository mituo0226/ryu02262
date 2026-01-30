// Cloudflare Pages Functions の型定義
import { generateSystemPrompt } from '../_lib/character-system.js';
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';

interface ConversationRow {
  role: 'user' | 'assistant';
  message?: string; // データベースの実際のカラム名
  content?: string; // SQLクエリでmessage as contentとしてエイリアスされた値
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
  hasOtherCharacterHistory?: boolean; // 他のキャラクターとの会話履歴があるかどうか
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
  welcomeMessage?: string | null; // 初回訪問時のウェルカムメッセージ（新規追加）
  returningMessage?: string | null; // 再訪問時のメッセージ（新規追加）
  visitPattern?: string; // 訪問パターン（新規追加）
  requireGuardianConsent?: boolean; // 楓専用: 守護神の儀式同意が必要かどうか（新規追加）
}

// 【削除】LLM API関連の定数・型定義・ユーティリティ関数
// conversation-history.tsからLLM API呼び出しを完全に除去したため、これらは不要になりました
// consult.tsでLLM API呼び出しが行われるため、ここでは削除

// 【削除】LLM API呼び出し関数（callDeepSeek, callOpenAI, getLLMResponse）
// conversation-history.tsからLLM API呼び出しを完全に除去したため、これらの関数は不要になりました
// consult.tsでLLM API呼び出しが行われるため、ここでは削除

// 【削除】定型文生成関数
// 非同期メッセージ生成方式に変更したため、定型文は不要になりました
// フロントエンドで「考え中...」を表示し、バックグラウンドで動的メッセージを生成します

// 【削除】generateReturningMessage と generateWelcomeMessage 関数
// LLM API呼び出しを完全に除去し、定型文を使用するため、これらの関数は不要になりました

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
    const nickname = url.searchParams.get('nickname');
    const birthYear = url.searchParams.get('birthYear');
    const birthMonth = url.searchParams.get('birthMonth');
    const birthDay = url.searchParams.get('birthDay');
    const characterId = url.searchParams.get('character') || 'kaede';

    let user: UserRecord | null = null;

    // 【変更】user_idを優先的に使用（より安全で効率的）
    if (userIdParam) {
      const userId = Number(userIdParam);
      if (Number.isFinite(userId) && userId > 0) {
        user = await env.DB.prepare<UserRecord>(
          'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE id = ?'
        )
          .bind(userId)
          .first();
      }
    }

    // user_idで取得できない場合、nickname + 生年月日で取得（後方互換性のため）
    if (!user && nickname && birthYear && birthMonth && birthDay) {
      user = await env.DB.prepare<UserRecord>(
        'SELECT id, nickname, birth_year, birth_month, birth_day, guardian FROM users WHERE nickname = ? AND birth_year = ? AND birth_month = ? AND birth_day = ?'
      )
        .bind(nickname.trim(), Number(birthYear), Number(birthMonth), Number(birthDay))
        .first();
    }

    if (!user) {
      return new Response(
        JSON.stringify({
          hasHistory: false,
          error: userIdParam ? 'user not found (invalid userId)' : 'nickname and birth date are required',
        } as ResponseBody),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // ===== ユーザーの会話履歴取得 =====
    // 【重要】実際のデータベースにはmessageカラムが存在し、contentカラムは存在しない
    // したがって、messageカラムのみを使用する
    const historyResults = await env.DB.prepare<ConversationRow>(
      `SELECT c.role, c.message as content, c.message, COALESCE(c.timestamp, c.created_at) as created_at
       FROM conversations c
       WHERE c.user_id = ? AND c.character_id = ?
       ORDER BY COALESCE(c.timestamp, c.created_at) DESC
       LIMIT 20`
    )
      .bind(user.id, characterId)
      .all();

    const conversations = historyResults.results || [];
    
    console.log('[conversation-history] 会話履歴を取得しました:', {
      userId: user.id,
      characterId: characterId,
      conversationCount: conversations.length,
      firstConversationRole: conversations.length > 0 ? conversations[0].role : 'N/A',
      firstConversationTime: conversations.length > 0 ? conversations[0].created_at : 'N/A'
    });

    // 儀式完了後の判定：guardianが設定されている場合
    // 儀式完了後は、APIの指示によりチャットをクリアし、会話はゼロからスタート
    const isAfterRitual = !!user.guardian;

    // 他のキャラクターとの会話履歴があるかどうかを確認
    // 現在のキャラクター以外（kaede, yukino, sora, kaon）との会話履歴を確認
    const allCharacters = ['kaede', 'yukino', 'sora', 'kaon'];
    const otherCharacters = allCharacters.filter(c => c !== characterId);
    
    let hasOtherCharacterHistory = false;
    if (conversations.length === 0 && otherCharacters.length > 0) {
      // 現在のキャラクターとの会話履歴がない場合、他のキャラクターとの会話履歴を確認
      // SQLクエリを動的に構築（IN句を使用）
      const placeholders = otherCharacters.map(() => '?').join(',');
      const otherHistoryResults = await env.DB.prepare<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM conversations
         WHERE user_id = ? AND character_id IN (${placeholders})
         LIMIT 1`
      )
        .bind(user.id, ...otherCharacters)
        .first();
      
      hasOtherCharacterHistory = (otherHistoryResults?.count || 0) > 0;
    }

    if (conversations.length === 0) {
      // 訪問パターンを判定（初回訪問時）
      const visitPatternInfo = await detectVisitPattern({
        userId: user.id,
        characterId: characterId,
        database: env.DB,
        isRegisteredUser: !!user.nickname,
      });
      
      // 履歴がない場合、welcomeMessageを生成
      let welcomeMessage: string | null = null;
      let requireGuardianConsent: boolean = false;
      
      // 楓専用: 守護神状態を確認
      if (characterId === 'kaede') {
        const hasGuardian = !!user.guardian && user.guardian.trim() !== '';
        
        if (!hasGuardian) {
          // 守護神未決定: 儀式同意を促すメッセージを生成
          requireGuardianConsent = true;
          try {
            // 守護神未決定時のシステムプロンプトを生成（訪問パターンは既に取得済み）
            let userGender: string | null = null;
            let userBirthDate: string | null = null;
            
            try {
              const userInfo = await env.DB.prepare<{ gender: string | null; birth_year: number | null; birth_month: number | null; birth_day: number | null }>(
                'SELECT gender, birth_year, birth_month, birth_day FROM users WHERE id = ?'
              )
                .bind(user.id)
                .first();
              
              if (userInfo) {
                userGender = userInfo.gender || null;
                if (userInfo.birth_year && userInfo.birth_month && userInfo.birth_day) {
                  const yearStr = String(userInfo.birth_year).padStart(4, '0');
                  const monthStr = String(userInfo.birth_month).padStart(2, '0');
                  const dayStr = String(userInfo.birth_day).padStart(2, '0');
                  userBirthDate = `${yearStr}-${monthStr}-${dayStr}`;
                }
              }
            } catch (error) {
              console.error('[conversation-history] ユーザー情報取得エラー:', error);
            }
            
            // 守護神未決定時: welcomeMessageは生成しない（フロントエンドで非同期生成）
            console.log('[conversation-history] 楓の守護神未決定時: welcomeMessageはフロントエンドで非同期生成されます');
          } catch (error) {
            console.error('[conversation-history] 楓の守護神未決定時の処理エラー:', error);
          }
        } else {
          // 守護神決定済み: welcomeMessageは生成しない（フロントエンドで非同期生成）
          console.log('[conversation-history] 守護神決定済み: welcomeMessageはフロントエンドで非同期生成されます');
        }
      } else {
        // 楓以外: welcomeMessageは生成しない（フロントエンドで非同期生成）
        console.log('[conversation-history] 楓以外: welcomeMessageはフロントエンドで非同期生成されます');
      }

      return new Response(
        JSON.stringify({
          hasHistory: false,
          hasOtherCharacterHistory,
          nickname: user.nickname,
          birthYear: user.birth_year,
          birthMonth: user.birth_month,
          birthDay: user.birth_day,
          assignedDeity: user.guardian,
          clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
          welcomeMessage: null, // フロントエンドで非同期生成（generate-welcome APIを使用）
          requireGuardianConsent: characterId === 'kaede' ? requireGuardianConsent : undefined, // 楓専用フラグ
          visitPattern: visitPatternInfo?.pattern || 'first_visit', // 訪問パターン
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

    // 【変更】履歴を表示しないため、recentMessagesは空配列を返す
    // 鑑定士の挨拶メッセージで過去の会話を記憶していることを示すため、履歴表示は不要
    const recentMessages: Array<{
      role: 'user' | 'assistant';
      content: string;
      created_at?: string;
    }> = [];

    // 会話履歴をClientHistoryEntry形式に変換
    const conversationHistoryForLLM: ClientHistoryEntry[] = sortedConversations.map((row) => ({
      role: row.role,
      content: row.content || row.message || '',
    }));

    // 最後のユーザーメッセージを抽出
    const lastUserMessage = sortedConversations
      .filter((msg) => msg.role === 'user')
      .slice(-1)[0]?.content || null;

    // 訪問パターンを判定
    const visitPatternInfo = await detectVisitPattern({
      userId: user.id,
      characterId: characterId,
      database: env.DB,
      isRegisteredUser: !!user.nickname,
    });

    // 【改善】returningMessageは生成しない（フロントエンドで非同期生成）
    // ページ読み込みをブロックしないように、フロントエンドでgenerate-welcome APIを呼び出す
    const returningMessage = null;
    console.log('[conversation-history] returningMessageはフロントエンドで非同期生成されます（generate-welcome APIを使用）');

    // 会話の要約を生成（最後の数件のメッセージから）
    // SQLクエリでmessage as contentとしてエイリアスしているため、msg.contentに値が入る
    const lastMessages = sortedConversations.slice(-6);
    const conversationText = lastMessages
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : '鑑定士'}: ${msg.content || msg.message || ''}`)
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
        firstQuestion = todayMessages[0].content || todayMessages[0].message || '';
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
        hasOtherCharacterHistory: true, // 現在のキャラクターとの会話履歴がある場合、他のキャラクターとの会話履歴も確認済みとして扱う
        nickname: user.nickname,
        birthYear: user.birth_year,
        birthMonth: user.birth_month,
        birthDay: user.birth_day,
        assignedDeity: user.guardian, // guardianカラムから取得
        lastConversationDate,
        recentMessages: [], // 【変更】履歴は表示しない（空配列を返す）
        conversationSummary: conversationText, // システムプロンプト生成用に保持（表示はしない）
        clearChat: isAfterRitual, // 儀式完了後の場合はチャットクリア指示
        firstQuestion: firstQuestion, // 最初の質問（儀式完了後の定型文で使用）
        returningMessage: null, // フロントエンドで非同期生成（generate-welcome APIを使用）
        visitPattern: visitPatternInfo?.pattern || 'returning', // 訪問パターン
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





