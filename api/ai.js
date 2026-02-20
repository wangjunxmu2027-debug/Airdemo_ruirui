export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SECRET_KEY = '2a86a17e674560f6926f8ae647b895ce';

  function generateNonce() {
    return Math.random().toString(36).substr(2, 15);
  }

  function normalizeData(data) {
    if (!data || typeof data !== 'object') return [];
    return Object.keys(data)
      .sort()
      .filter((k) => data[k] !== undefined)
      .map((k) => [k, data[k]]);
  }

  function signWithCrypto(secret, message) {
    const crypto = require('crypto');
    const h = crypto.createHmac('sha256', String(secret));
    h.update(message);
    return h.digest('hex');
  }

  function generateSignature(nonce, timestamp, secret, data) {
    const dataSorted = normalizeData(data);
    const message = nonce + timestamp + JSON.stringify(dataSorted);
    return signWithCrypto(secret, message);
  }

  try {
    const body = req.body;
    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const signature = generateSignature(nonce, timestamp, SECRET_KEY, body);

    const response = await fetch('https://magic.solutionsuite.cn/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Codoc-Nonce': nonce,
        'Codoc-Timestamp': timestamp,
        'Codoc-Signature': signature,
        'Codoc-Env': 'Shortcut'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Proxy request failed' });
  }
}
