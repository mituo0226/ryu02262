// Cloudflare Pages Functions
// 会話履歴クリーンアップAPI - 古いメッセージの自動削除

import { isAdminAuthorized } from '../lib/admin-auth.mjs';

const MAX_MESSAGES_PER_CHARACTER = 100;
const CLEANUP_BATCH_SIZE = 1000; // 一度に処理するレコード数

interface CleanupStats {
  deletedMessages: number;
  affectedUsers: number;
  affectedCharacters: number;
  executionTime: number;
}

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// クリーンアップ処理（POST）
export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // 管理者認証（本番環境では必須）
  if (!isAdminAuthorized(request, env)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized',
      }),
      { status: 401, headers: corsHeaders }
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'auto'; // 'auto' | 'limit' | 'date'
    const daysOld = body.daysOld || 90; // デフォルト90日以上古いメッセージを削除

    let deletedMessages = 0;
    let affectedUsers = 0;
    let affectedCharacters = 0;

    if (mode === 'limit') {
      // モード1: 100件制限の強制適用
      // 各ユーザー・鑑定士の組み合わせで100件を超える場合は古いメッセージを削除

      // 100件を超えている組み合わせを取得
      const overLimitResults = await env.DB.prepare<{
        user_id: number;
        character_id: string;
        count: number;
      }>(
        `SELECT 
           user_id,
           character_id,
           COUNT(*) as count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING COUNT(*) > ?
         ORDER BY count DESC`
      )
        .bind(MAX_MESSAGES_PER_CHARACTER)
        .all();

      if (overLimitResults.results) {
        for (const row of overLimitResults.results) {
          const deleteCount = row.count - MAX_MESSAGES_PER_CHARACTER;

          const deleteResult = await env.DB.prepare(
            `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ?
             AND id IN (
               SELECT id FROM conversations
               WHERE user_id = ? AND character_id = ?
               ORDER BY timestamp ASC
               LIMIT ?
             )`
          )
            .bind(row.user_id, row.character_id, row.user_id, row.character_id, deleteCount)
            .run();

          deletedMessages += deleteResult.meta.changes || 0;
          affectedUsers = new Set([...Array(affectedUsers), row.user_id]).size;
          affectedCharacters = new Set([...Array(affectedCharacters), row.character_id]).size;
        }
      }
    } else if (mode === 'date') {
      // モード2: 日付基準の削除（指定日数以上古いメッセージを削除）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleteResult = await env.DB.prepare(
        `DELETE FROM conversations
         WHERE timestamp < ?`
      )
        .bind(cutoffDate.toISOString())
        .run();

      deletedMessages = deleteResult.meta.changes || 0;

      // 影響を受けたユーザー・鑑定士を取得
      const affectedResults = await env.DB.prepare<{
        user_id: number;
        character_id: string;
      }>(
        `SELECT DISTINCT user_id, character_id
         FROM conversations
         WHERE timestamp < ?`
      )
        .bind(cutoffDate.toISOString())
        .all();

      if (affectedResults.results) {
        affectedUsers = new Set(affectedResults.results.map((r) => r.user_id)).size;
        affectedCharacters = new Set(affectedResults.results.map((r) => r.character_id)).size;
      }
    } else {
      // モード3: 自動（100件制限 + 日付基準の両方）
      // まず100件制限を適用
      const overLimitResults = await env.DB.prepare<{
        user_id: number;
        character_id: string;
        count: number;
      }>(
        `SELECT 
           user_id,
           character_id,
           COUNT(*) as count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING COUNT(*) > ?`
      )
        .bind(MAX_MESSAGES_PER_CHARACTER)
        .all();

      if (overLimitResults.results) {
        for (const row of overLimitResults.results) {
          const deleteCount = row.count - MAX_MESSAGES_PER_CHARACTER;

          const deleteResult = await env.DB.prepare(
            `DELETE FROM conversations
             WHERE user_id = ? AND character_id = ?
             AND id IN (
               SELECT id FROM conversations
               WHERE user_id = ? AND character_id = ?
               ORDER BY timestamp ASC
               LIMIT ?
             )`
          )
            .bind(row.user_id, row.character_id, row.user_id, row.character_id, deleteCount)
            .run();

          deletedMessages += deleteResult.meta.changes || 0;
        }
      }

      // 次に日付基準の削除（90日以上古いメッセージ）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const dateDeleteResult = await env.DB.prepare(
        `DELETE FROM conversations
         WHERE timestamp < ?`
      )
        .bind(cutoffDate.toISOString())
        .run();

      deletedMessages += dateDeleteResult.meta.changes || 0;
    }

    const executionTime = Date.now() - startTime;

    const stats: CleanupStats = {
      deletedMessages,
      affectedUsers,
      affectedCharacters,
      executionTime,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in cleanup-conversations:', error);
    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        executionTime,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// 統計情報取得（GET）
export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 管理者認証
    if (!isAdminAuthorized(request, env)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 統計情報を取得
    const totalMessages = await env.DB.prepare<{ count: number }>(
      'SELECT COUNT(*) as count FROM conversations'
    ).first();

    const totalUsers = await env.DB.prepare<{ count: number }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM conversations'
    ).first();

    const overLimitCount = await env.DB.prepare<{ count: number }>(
      `SELECT COUNT(*) as count FROM (
         SELECT user_id, character_id, COUNT(*) as msg_count
         FROM conversations
         GROUP BY user_id, character_id
         HAVING msg_count > ?
       )`
    )
      .bind(MAX_MESSAGES_PER_CHARACTER)
      .first();

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalMessages: totalMessages?.count || 0,
          totalUsers: totalUsers?.count || 0,
          overLimitConversations: overLimitCount?.count || 0,
          maxMessagesPerCharacter: MAX_MESSAGES_PER_CHARACTER,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in cleanup-conversations GET:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};



