export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

const SECRET_KEY = '2a86a17e674560f6926f8ae647b895ce';
const TARGET_API = 'https://magic.solutionsuite.cn/api/ai';

function generateNonce(): string {
  return Math.random().toString(36).substr(2, 15);
}

function normalizeData(data: Record<string, unknown> | null): [string, unknown][] {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data)
    .sort()
    .filter((k) => data[k] !== undefined)
    .map((k) => [k, data[k]]);
}

async function signWithCrypto(secret: string, message: string): Promise<string> {
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
  return signWithCrypto(secret, message);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  }

  try {
    const body = await request.json();
    
    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const signature = await generateSignature(nonce, timestamp, SECRET_KEY, body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(TARGET_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Codoc-Nonce': nonce,
        'Codoc-Timestamp': timestamp,
        'Codoc-Signature': signature,
        'Codoc-Env': 'Shortcut',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  } catch (error) {
    console.error('API proxy error:', error);
    const errorMessage = error instanceof Error && error.name === 'AbortError' 
      ? 'Request timeout' 
      : 'Internal Server Error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
