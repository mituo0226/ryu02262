/**
 * ロールベースのアクセス制御
 * @param {string} role - 'admin' または 'staff'
 */
function getRequiredIpsForRole(role, env) {
  if (role === 'admin') {
    // Admin向けIP（通常はローカルのみ）
    const adminIps = env.ADMIN_IP_LIST || '127.0.0.1,::1';
    return adminIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  } else if (role === 'staff') {
    // Staff向けIP（adminが設定）
    const staffIps = env.STAFF_ALLOWED_IPS || '127.0.0.1,::1';
    return staffIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  }
  return [];
}

function isAdminAuthorized(request, env) {
  // IPアドレスベースの認証
  const clientIp = getClientIp(request);
  
  // 許可されたIPアドレスリスト
  const allowedIps = getAllowedIps(env);
  
  const isAllowed = allowedIps.some(allowedIp => {
    // 完全一致またはサブネット一致をチェック
    if (allowedIp.includes('/')) {
      // CIDR表記の場合はここで処理可能（簡易版では完全一致のみ）
      return clientIp === allowedIp.split('/')[0];
    }
    return clientIp === allowedIp;
  });
  
  console.log('[admin-auth]', {
    clientIp,
    allowedIps,
    isAllowed,
  });
  
  return isAllowed;
}

/**
 * データベースから許可IPを動的に取得
 */
async function getAdminIpsFromDatabase(db) {
  try {
    const result = await db.prepare(
      `SELECT ip_address FROM admin_ips WHERE is_active = 1 ORDER BY created_at DESC`
    ).all();
    
    return result.results?.map((row) => row.ip_address) || [];
  } catch (error) {
    console.error('[admin-auth] Failed to fetch admin IPs from database:', error);
    // DB取得失敗時は環境変数にフォールバック
    return [];
  }
}

/**
 * データベースベースの認証（非同期版）
 */
async function isAdminAuthorizedAsync(request, env) {
  const clientIp = getClientIp(request);
  
  // データベースから登録IPを取得
  let allowedIps = [];
  if (env.DB) {
    allowedIps = await getAdminIpsFromDatabase(env.DB);
  }
  
  // DBから取得できなかった場合は環境変数にフォールバック
  if (allowedIps.length === 0) {
    allowedIps = getAllowedIps(env);
  }
  
  const isAllowed = allowedIps.some(allowedIp => {
    if (allowedIp.includes('/')) {
      return clientIp === allowedIp.split('/')[0];
    }
    return clientIp === allowedIp;
  });
  
  console.log('[admin-auth-async]', {
    clientIp,
    allowedIps,
    isAllowed,
  });
  
  return isAllowed;
}

/**
 * ロールを判定（admin/staffのいずれか）
 */
function getUserRole(request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/\/(admin|staff)\//);
  return pathMatch ? pathMatch[1] : null;
}

/**
 * Admin操作かどうかを判定
 */
function isAdminOperation(request) {
  return getUserRole(request) === 'admin';
}

/**
 * 管理者用操作の認可確認
 */
function isAdminOperationAuthorized(request, env) {
  return isAdminOperation(request) && isAdminAuthorized(request, env);
}

function getClientIp(request) {
  // Cloudflareのヘッダーをチェック
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // その他のプロキシヘッダー
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // 最初のIPアドレスを取得
    return xForwardedFor.split(',')[0].trim();
  }
  
  // ローカルホスト（開発環境）
  return '127.0.0.1';
}

function getAllowedIps(env) {
  // 環境変数から許可IPリストを取得
  // 複数IPの場合はカンマ区切り: "192.168.1.1,192.168.1.2"
  const allowedIpsEnv = env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1';
  
  return allowedIpsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ 
    error: 'Unauthorized - Access denied from your IP address' 
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

module.exports = {
  isAdminAuthorized,
  isAdminAuthorizedAsync,
  unauthorizedResponse,
  getClientIp,
  getAllowedIps,
  getAdminIpsFromDatabase,
  getUserRole,
  isAdminOperation,
  isAdminOperationAuthorized,
  getRequiredIpsForRole,
};

