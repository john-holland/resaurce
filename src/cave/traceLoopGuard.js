'use strict';

const { loadCaveManifest } = require('./manifestLoader');

const traceRegistry = new Map();

function hopKey(h) {
  const r = h.route || '';
  const st = r.includes(':') ? r.split(':').slice(1).join(':') : r;
  return `${h.service}:${h.message || st}`;
}

function isHeartbeatExempt(message, config) {
  if (!message) return false;
  const hb = config.heartbeat || {};
  if (hb.enabled && hb.message === message) return true;
  const exempt = hb.exempt_messages || ['trace_heartbeat', 'presence_verify'];
  return exempt.includes(message);
}

function checkTraceLoop(service, body) {
  const manifest = loadCaveManifest();
  const config = { detect: true, prevent: true, max_hops: 32, ...(manifest.trace_loop || {}) };
  if (!config.detect) return { ok: true, body };

  const prevent = body.trace_loop?.prevent ?? config.prevent ?? true;
  const traceId = body.trace_id;
  if (!traceId) return { ok: true, body };

  const message = body.message;
  if (isHeartbeatExempt(message, config)) {
    traceRegistry.set(traceId, { expires: Date.now() + (config.ttl_ms || 300000) });
    return { ok: true, body };
  }

  const path = [...(body.causality_path || [])];
  const route = body.route || '';
  const hop = {
    service,
    route,
    message,
    hop: path.length + 1,
    at: new Date().toISOString(),
  };
  path.push(hop);

  if (path.length > (config.max_hops || 32) && prevent) {
    return { ok: false, error: 'CAUSAL_LOOP_DETECTED', trace_id: traceId, causality_path: path };
  }

  const key = hopKey(hop);
  for (const existing of path.slice(0, -1)) {
    if (hopKey(existing) === key && prevent) {
      return { ok: false, error: 'CAUSAL_LOOP_DETECTED', trace_id: traceId, causality_path: path };
    }
  }

  const next = { ...body, causality_path: path };
  traceRegistry.set(traceId, { expires: Date.now() + (config.ttl_ms || 300000) });
  return { ok: true, body: next };
}

module.exports = { checkTraceLoop };
