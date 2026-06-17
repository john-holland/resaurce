'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app } = require('../src/server');

function request(port, method, path, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: body
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          : {},
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          let json = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            json = { _raw: raw };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('Cave HR session + request + UI Tome + lvm append', async (t) => {
  const srv = http.createServer(app);
  await new Promise((resolve, reject) => {
    srv.listen(0, (e) => (e ? reject(e) : resolve()));
  });
  const port = srv.address().port;

  try {
    const tome = await request(port, 'GET', '/tome/resaurce-frontend');
    assert.strictEqual(tome.status, 200);
    assert.strictEqual(tome.json.service, 'resaurce');
    assert.ok(Array.isArray(tome.json.surfaces));
    assert.ok(tome.json.federation?.remote_entry_path);

    const manifest = await request(port, 'GET', '/cave/manifest');
    assert.strictEqual(manifest.status, 200);
    assert.strictEqual(manifest.json.schema_version, 'cave-manifest/1');
    assert.ok(manifest.json.messages?.request_hr_help);

    const lvm2 = await request(port, 'GET', '/lvm2/discover');
    assert.strictEqual(lvm2.status, 200);
    assert.strictEqual(lvm2.json.service, 'resaurce');
    assert.ok(Array.isArray(lvm2.json.machines));

    const sess = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:hr/help/session',
      payload: {},
      trace_id: 't-smoke-1',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(sess.status, 200);
    assert.strictEqual(sess.json.ok, true);

    const hr = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:hr/help/request',
      payload: { userId: 'u1', context: 'c' },
      trace_id: 't-smoke-hr',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(hr.status, 200);
    assert.strictEqual(hr.json.ok, true);
    assert.ok(hr.json.hrEmployeeId);

    const lvm = await request(port, 'POST', '/lvm/append', {
      trace_id: 't-ext',
      events: [{ schema: 'lvm2.0', type: 'SmokeTest', trace_id: 't-ext' }],
    });
    assert.strictEqual(lvm.status, 200);
    assert.strictEqual(lvm.json.ok, true);

    const emp = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:hr/employees/available',
      payload: { skills_required: ['documents'] },
      trace_id: 't-emp',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(emp.status, 200);
    assert.strictEqual(emp.json.ok, true);
    assert.ok(Array.isArray(emp.json.employees));

    const room = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:hr/chat/room/create',
      payload: { name: 'smoke', participants: ['a', 'b'] },
      trace_id: 't-chat',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(room.status, 200);
    assert.ok(room.json.chat_room?.id);

    const taxList = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:tax/documents/list',
      payload: {},
      trace_id: 't-tax-list',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(taxList.status, 200);
    assert.strictEqual(taxList.json.ok, true);
    assert.ok(Array.isArray(taxList.json.documents));

    const taxJob = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:tax/generate/enqueue',
      payload: {
        user_id: 'u_smoke',
        year: 2024,
        document_type: 'w2',
        trace_id: 't-tax-trace',
        session_id: 't-tax-sess',
      },
      trace_id: 't-tax-trace',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(taxJob.status, 200);
    assert.strictEqual(taxJob.json.ok, true);
    assert.ok(taxJob.json.document);

    const bad = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'saurce:commerce/wallet/balance',
      payload: {},
      trace_id: 't-x',
    });
    assert.strictEqual(bad.status, 404);

    const msgHr = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      message: 'request_hr_help',
      payload: { userId: 'u-msg', context: 'message delegation' },
      trace_id: 't-msg-hr',
      reply_mode: 'sync_http',
    });
    assert.strictEqual(msgHr.status, 200);
    assert.strictEqual(msgHr.json.ok, true);

    const loop = await request(port, 'POST', '/cave/route', {
      schema_version: '2.0',
      route: 'resaurce:hr/help/request',
      message: 'request_hr_help',
      payload: { userId: 'u-loop' },
      trace_id: 't-loop',
      causality_path: [
        {
          service: 'resaurce',
          route: 'resaurce:hr/help/request',
          message: 'request_hr_help',
          hop: 1,
          at: new Date().toISOString(),
        },
      ],
      reply_mode: 'sync_http',
    });
    assert.strictEqual(loop.status, 403);
    assert.strictEqual(loop.json.error, 'CAUSAL_LOOP_DETECTED');
  } finally {
    await new Promise((r) => srv.close(r));
  }
});
