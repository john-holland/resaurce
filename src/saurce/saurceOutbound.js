'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Narrow outbound POST to saurce Cave (`/cave/route`).
 * Use only for cross-domain enrichment (e.g. legal review referencing wallet exposure).
 * Configure `SOA_SAURCE_URL` (or `RESAURCE_SAURCE_URL` fallback) on the resaurce host.
 * @param {Record<string, unknown>} body Cave envelope v2
 * @returns {Promise<{ ok: boolean, status: number, json?: Record<string, unknown>, error?: string }>}
 */
function postSaurceCaveRoute(body) {
  const base = (process.env.SOA_SAURCE_URL || process.env.RESAURCE_SAURCE_URL || '').trim().replace(/\/$/, '');
  if (!base) {
    return Promise.resolve({ ok: false, status: 0, error: 'saurce_url_unset' });
  }
  const url = new URL(`${base}/cave/route`);
  const payload = JSON.stringify(body);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 20000,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(raw || '{}');
          } catch {
            json = { ok: false, error: 'invalid_json' };
          }
          resolve({ ok: res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode || 0, json });
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, status: 0, error: String(e.message || e) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: 'timeout' });
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { postSaurceCaveRoute };
