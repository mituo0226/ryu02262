/**
 * admin/admin-ips.ts
 * 管理者用IPアドレスの管理エンドポイント
 * 認可チェック廃止版
 */

const jsonHeaders = { 'Content-Type': 'application/json' };

export const onRequest: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);

  // POST: 新しいIPを追加
  if (request.method === 'POST') {
    try {
      const body = await request.json() as {
        ip_address?: string;
        description?: string;
      };

      const { ip_address, description } = body;

      if (!ip_address) {
        return new Response(JSON.stringify({
          error: 'ip_address is required',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      // IPアドレスの簡易バリデーション
      if (!/^[\d.a-fA-F:]+$/.test(ip_address)) {
        return new Response(JSON.stringify({
          error: 'Invalid IP address format',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const result = await env.DB.prepare(
        `INSERT INTO admin_ips (ip_address, description, is_active)
         VALUES (?, ?, 1)`
      )
        .bind(ip_address, description || null)
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: 'IP address added',
        id: result.meta.last_row_id,
      }), {
        status: 201,
        headers: jsonHeaders,
      });
    } catch (error) {
      console.error('[admin/admin-ips] POST error:', error);
      
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        return new Response(JSON.stringify({
          error: 'This IP address is already registered',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      return new Response(JSON.stringify({
        error: 'Failed to add IP address',
        details: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  // GET: すべての登録IPを取得
  if (request.method === 'GET') {
    try {
      const ips = await env.DB.prepare(
        `SELECT id, ip_address, description, is_active, created_at, updated_at
         FROM admin_ips
         ORDER BY created_at DESC`
      ).all();

      return new Response(JSON.stringify({
        success: true,
        ips: ips.results ?? [],
      }), {
        status: 200,
        headers: jsonHeaders,
      });
    } catch (error) {
      console.error('[admin/admin-ips] GET error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch admin IPs',
        details: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  // DELETE: IPを削除
  if (request.method === 'DELETE') {
    try {
      const id = url.searchParams.get('id');

      if (!id || isNaN(Number(id))) {
        return new Response(JSON.stringify({
          error: 'id parameter is required and must be a number',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const result = await env.DB.prepare(
        `DELETE FROM admin_ips WHERE id = ?`
      )
        .bind(Number(id))
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: 'IP address deleted',
        deletedCount: result.meta.changes,
      }), {
        status: 200,
        headers: jsonHeaders,
      });
    } catch (error) {
      console.error('[admin/admin-ips] DELETE error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to delete IP address',
        details: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  // PATCH: IPの説明/有効状態を更新
  if (request.method === 'PATCH') {
    try {
      const body = await request.json() as {
        id?: number;
        description?: string;
        is_active?: boolean;
      };

      const { id, description, is_active } = body;

      if (!id) {
        return new Response(JSON.stringify({
          error: 'id is required',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const updates: string[] = [];
      const values: (string | number | boolean | null)[] = [];

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }

      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      if (updates.length <= 1) {
        return new Response(JSON.stringify({
          error: 'No fields to update',
        }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const result = await env.DB.prepare(
        `UPDATE admin_ips SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...values)
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: 'IP address updated',
        changedCount: result.meta.changes,
      }), {
        status: 200,
        headers: jsonHeaders,
      });
    } catch (error) {
      console.error('[admin/admin-ips] PATCH error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to update IP address',
        details: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: jsonHeaders,
  });
};
