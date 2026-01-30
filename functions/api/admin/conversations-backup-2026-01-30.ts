const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: PagesFunction = async ({ request, env }) => {
  // 認可チェック廃止 - すべてのリクエストを許可
  
  const url = new URL(request.url);
  const userIdParam = url.searchParams.get('userId');

  if (request.method === 'GET') {
    if (!userIdParam) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: jsonHeaders });
    }
    const userId = Number(userIdParam);
    if (!Number.isFinite(userId)) {
      return new Response(JSON.stringify({ error: 'invalid userId' }), { status: 400, headers: jsonHeaders });
    }

    const history = await env.DB.prepare<{
      id: number;
      character_id: string;
      role: string;
      message: string;
      created_at: string;
    }>(
      `SELECT id, character_id, role, message, created_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    )
      .bind(userId)
      .all();

    return new Response(JSON.stringify({ conversations: history.results ?? [] }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  // DELETE: 指定された会話IDを削除、または特定ユーザー・キャラクターの全履歴を削除
  if (request.method === 'DELETE') {
    try {
      const body = await request.json() as {
        conversationIds?: number[];
        userId?: number;
        characterId?: string;
        deleteAll?: boolean;
      };
      const { conversationIds, userId, characterId, deleteAll } = body;

      // 特定ユーザー・キャラクターの全履歴を削除するモード
      if (deleteAll && userId && characterId) {
        const result = await env.DB.prepare(
          `DELETE FROM conversations WHERE user_id = ? AND character_id = ?`
        )
          .bind(userId, characterId)
          .run();

        const deletedCount = result.meta.changes;

        console.log('[admin/conversations] DELETE all by user/character:', {
          userId,
          characterId,
          deletedCount,
        });

        return new Response(
          JSON.stringify({
            success: true,
            deletedCount,
            message: `${characterId}との会話履歴${deletedCount}件を削除しました`,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      // 個別IDで削除するモード（既存）
      if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'conversationIds array is required or deleteAll mode' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // すべてのIDが数値であることを確認
      if (!conversationIds.every(id => Number.isFinite(id))) {
        return new Response(
          JSON.stringify({ error: 'all conversationIds must be numbers' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      // 削除実行（複数IDを安全に削除）
      let deletedCount = 0;
      for (const conversationId of conversationIds) {
        const result = await env.DB.prepare(
          `DELETE FROM conversations WHERE id = ?`
        )
          .bind(conversationId)
          .run();
        deletedCount += result.meta.changes;
      }

      console.log('[admin/conversations] DELETE:', {
        conversationIds,
        deletedCount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          deletedCount,
          requestedCount: conversationIds.length,
        }),
        { status: 200, headers: jsonHeaders }
      );
    } catch (error) {
      console.error('[admin/conversations] DELETE error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete conversations',
          details: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: jsonHeaders }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
};





