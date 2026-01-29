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
  unauthorizedResponse,
  getClientIp,
  getAllowedIps,
};

