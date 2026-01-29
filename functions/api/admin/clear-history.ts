/**
 * admin/clear-history.ts
 * ユーザーの会話履歴をクリアする管理エンドポイント
 * 
 * 使用方法:
 * POST /api/admin/clear-history
 * Body: { userId: number, characterId: string }
 */

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 管理者認証（簡易版：Authorization headerをチェック）
  const authHeader = request.headers.get('Authorization');
  const adminToken = env.ADMIN_TOKEN || 'dev-token';
  
  if (authHeader !== `Bearer ${adminToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId, characterId } = await request.json();

    if (!userId || !characterId) {
      return new Response(
        JSON.stringify({ error: 'userId and characterId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['kaede', 'yukino', 'sora', 'kaon'].includes(characterId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid characterId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // クリア前の件数を確認
    const beforeResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM conversations 
      WHERE user_id = ? AND character_id = ?
    `).bind(userId, characterId).first();

    const beforeCount = beforeResult?.count || 0;

    // 会話履歴を削除
    const deleteResult = await env.DB.prepare(`
      DELETE FROM conversations 
      WHERE user_id = ? AND character_id = ?
    `).bind(userId, characterId).run();

    // クリア後の件数を確認
    const afterResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM conversations 
      WHERE user_id = ? AND character_id = ?
    `).bind(userId, characterId).first();

    const afterCount = afterResult?.count || 0;

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        characterId,
        deletedCount: deleteResult.meta.changes,
        beforeCount,
        afterCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[admin/clear-history] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
