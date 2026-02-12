const SECRET_KEY = '2a86a17e674560f6926f8ae647b895ce';

function generateNonce(): string {
  return Math.random().toString(36).substr(2, 15);
}

function normalizeData(data: Record<string, unknown> | null): [string, unknown][] {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data)
    .sort()
    .filter((k) => (data as Record<string, unknown>)[k] !== undefined)
    .map((k) => [k, (data as Record<string, unknown>)[k]]);
}

async function signWithWebCrypto(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateSignature(
  nonce: string,
  timestamp: string,
  secret: string,
  data: Record<string, unknown>
): Promise<string> {
  const dataSorted = normalizeData(data);
  const message = nonce + timestamp + JSON.stringify(dataSorted);
  return signWithWebCrypto(secret, message);
}

interface HmacOptions {
  secret: string;
  nonce?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

interface FetchOptions extends RequestInit {
  hmac?: HmacOptions;
}

function coerceBody(body: unknown): { body: unknown; bodyData: Record<string, unknown> | null } {
  if (!body || typeof body !== 'object') return { body, bodyData: null };
  if (body instanceof ArrayBuffer) return { body, bodyData: null };
  if (body instanceof Uint8Array) return { body, bodyData: null };
  if (typeof FormData !== 'undefined' && body instanceof FormData) return { body, bodyData: null };
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return { body, bodyData: null };
  const json = JSON.stringify(body);
  return { body: json, bodyData: body as Record<string, unknown> };
}

export async function hmacFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { hmac, headers: rawHeaders, body: rawBody, ...rest } = options;

  const secret = hmac?.secret || SECRET_KEY;
  const nonce = hmac?.nonce || generateNonce();
  const timestamp = hmac?.timestamp || Date.now().toString();

  const { body, bodyData } = coerceBody(rawBody);
  const dataToSign = hmac?.data ?? bodyData ?? {};
  const signature = await generateSignature(nonce, timestamp, secret, dataToSign);

  const headers = new Headers(rawHeaders || {});
  if (bodyData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Codoc-Nonce', nonce);
  headers.set('Codoc-Timestamp', timestamp);
  headers.set('Codoc-Signature', signature);
  if (!headers.has('Codoc-Env')) {
    headers.set('Codoc-Env', 'Shortcut');
  }

  return fetch(url, { ...rest, headers, body: body as BodyInit });
}

export const HMAC_SECRET_KEY = SECRET_KEY;
