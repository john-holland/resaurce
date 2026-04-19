'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { handleCaveRoute } = require('./cave/router');
const { applyDevMockEnvelope } = require('./cave/devIdentity');
const { handleLvmAppend } = require('./lvm/appendHandler');
const { loadFrontendTomeJson } = require('./tome/frontendTome');

const app = express();
app.use(express.json({ limit: '2mb' }));

function corsMiddleware(req, res, next) {
  const raw = (process.env.RESAURCE_CORS_ORIGINS || '').trim();
  if (!raw) return next();
  const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (origin && (origins.includes('*') || origins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

app.use(corsMiddleware);

const spaPublic = path.join(__dirname, '../spa/public');
const hrRemoteDist = path.join(__dirname, '../hr-remote/dist');
app.use('/app', express.static(spaPublic, { index: 'index.html', fallthrough: true }));
app.use('/remote', express.static(hrRemoteDist, { fallthrough: true }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'resaurce' });
});

app.get('/tome/resaurce-frontend', (_req, res) => {
  const doc = loadFrontendTomeJson();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(doc);
});

app.get('/lvm2/discover', (_req, res) => {
  const manifestPath = path.join(__dirname, '../contracts/lvm2/resaurce-machines.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(500).json({ ok: false, error: 'manifest_unavailable' });
  }
});

function enforceAllowedRoutes(body) {
  if (process.env.RESAURCE_ENFORCE_ALLOWED_ROUTES !== '1') return null;
  const route = String(body.route || '');
  const ui = loadFrontendTomeJson();
  const allowed = Array.isArray(ui.allowed_routes) ? ui.allowed_routes : [];
  if (route && !allowed.includes(route)) {
    return { ok: false, error: 'route_not_allowed', route };
  }
  return null;
}

app.post('/cave/route', (req, res) => {
  let body = req.body || {};
  if (body.schema_version && body.schema_version !== '2.0') {
    return res.status(400).json({ ok: false, error: 'unsupported_schema' });
  }
  body = applyDevMockEnvelope(body);
  const denied = enforceAllowedRoutes(body);
  if (denied) {
    return res.status(403).json(denied);
  }
  const out = handleCaveRoute(body);
  const status = out.ok === false && out.error === 'unknown_route' ? 404 : 200;
  res.status(status).json(out);
});

app.post('/lvm/append', (req, res) => {
  const body = req.body || {};
  handleLvmAppend(body).then((out) => {
    const status = out.ok === false ? 400 : 200;
    res.status(status).json(out);
  });
});

const port = Number(process.env.PORT || 3456);
if (require.main === module) {
  app.listen(port, () => {
    console.log(`resaurce Cave listening on http://127.0.0.1:${port}`);
    console.log(`  UI Tome: GET http://127.0.0.1:${port}/tome/resaurce-frontend`);
    console.log(`  LVM2:    GET http://127.0.0.1:${port}/lvm2/discover (Node route manifest)`);
    console.log(`  SPA:     http://127.0.0.1:${port}/app/`);
    console.log(`  MF:      http://127.0.0.1:${port}/remote/remoteEntry.js`);
    if (process.env.RESAURCE_DEV_MOCK_USER === '1') {
      console.warn('[resaurce] RESAURCE_DEV_MOCK_USER=1 — injecting mock tenant/presence (dev only)');
    }
  });
}

module.exports = { app };
