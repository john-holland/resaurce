'use strict';

const { appendInternal, forwardToRemote } = require('./appendStore');

/**
 * Handle POST /lvm/append body: { trace_id, events: [...] }
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ ok: boolean, trace_id?: string, stored?: number, error?: string }>}
 */
function handleLvmAppend(body) {
  const traceId = String(body.trace_id || '');
  const events = Array.isArray(body.events) ? body.events : [];
  if (!traceId) {
    return Promise.resolve({ ok: false, error: 'missing_trace_id' });
  }
  if (!events.length) {
    return Promise.resolve({ ok: false, error: 'missing_events' });
  }
  appendInternal(traceId, events);
  const forward = (process.env.LVM_FORWARD_URL || '').trim();
  if (forward) {
    return forwardToRemote(forward, traceId, events).then(() => ({
      ok: true,
      trace_id: traceId,
      stored: events.length,
    }));
  }
  return Promise.resolve({ ok: true, trace_id: traceId, stored: events.length });
}

module.exports = { handleLvmAppend };
