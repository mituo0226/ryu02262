const encoder = new TextEncoder();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function generateUserToken(userId: number, secret: string): Promise<string> {
  const issuedAt = Date.now();
  const payload = ${userId}.;
  const key = await getKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = base64UrlEncode(signatureBuffer);
  return ${userId}..;
}

export async function verifyUserToken(token: string | undefined, secret: string): Promise<{ userId: number } | null> {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [userIdPart, issuedAtPart, signature] = parts;
  const userId = Number(userIdPart);
  const issuedAt = Number(issuedAtPart);
  if (!Number.isFinite(userId) || !Number.isFinite(issuedAt)) {
    return null;
  }
  if (Date.now() - issuedAt > TOKEN_TTL_MS) {
    return null;
  }
  const payload = ${userId}.;
  const key = await getKey(secret);
  const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = base64UrlEncode(expectedSignatureBuffer);
  if (expectedSignature !== signature) {
    return null;
  }
  return { userId };
}
