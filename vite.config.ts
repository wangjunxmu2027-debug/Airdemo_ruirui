import path from 'path';
import crypto from 'crypto';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const SECRET_KEY = '2a86a17e674560f6926f8ae647b895ce';

function generateNonce(): string {
  return Math.random().toString(36).substr(2, 15);
}

function normalizeData(data: Record<string, unknown>): [string, unknown][] {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data)
    .sort()
    .filter((k) => data[k] !== undefined)
    .map((k) => [k, data[k]]);
}

function generateSignature(
  nonce: string,
  timestamp: string,
  secret: string,
  data: Record<string, unknown>
): string {
  const dataSorted = normalizeData(data);
  const message = nonce + timestamp + JSON.stringify(dataSorted);
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 8080,
        host: '0.0.0.0',
        proxy: {
          '/api/ai': {
            target: 'https://magic.solutionsuite.cn',
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq, req) => {
                const nonce = generateNonce();
                const timestamp = Date.now().toString();
                
                let bodyData: Record<string, unknown> = {};
                if (req.method === 'POST' && req.body) {
                  try {
                    bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                  } catch {
                    bodyData = {};
                  }
                }
                
                const signature = generateSignature(nonce, timestamp, SECRET_KEY, bodyData);
                
                proxyReq.setHeader('Codoc-Nonce', nonce);
                proxyReq.setHeader('Codoc-Timestamp', timestamp);
                proxyReq.setHeader('Codoc-Signature', signature);
                proxyReq.setHeader('Codoc-Env', 'Shortcut');
              });
            },
          },
          '/functions/v1': {
            target: 'https://xqsviesaffzksjuqbxey.supabase.co',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
        'process.env.BASE_URL': JSON.stringify(env.BASE_URL || env.API_BASE_URL || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: undefined
          }
        }
      }
    };
});
