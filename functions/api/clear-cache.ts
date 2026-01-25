// Cloudflare Pages Functions の型定義

interface RequestBody {
  userId: number;
  character?: string;
}

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await request.json();
    const { userId, character = 'kaede' } = body;

    if (!userId || typeof userId !== 'number' || userId <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid userId' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const cache = env.CHAT_CACHE as KVNamespace | undefined;
    if (!cache) {
      return new Response(
        JSON.stringify({ success: false, error: 'CHAT_CACHE is not configured' }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const cacheKey = `chat_history:${userId}:${character}`;

    try {
      await cache.delete(cacheKey);
      console.log('[clear-cache] キャッシュを削除しました:', cacheKey);
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    } catch (error) {
      console.error('[clear-cache] キャッシュ削除エラー:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete cache',
        }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (error) {
    console.error('[clear-cache] エラー:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
