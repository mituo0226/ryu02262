export function isAdminAuthorized(request, env) {
  const header = request.headers.get('x-admin-token') || request.headers.get('X-Admin-Token');                                                                  
  if (!env.ADMIN_TOKEN) {
    console.warn('ADMIN_TOKEN is not configured');
    return false;
  }
  return header === env.ADMIN_TOKEN;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

