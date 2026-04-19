'use strict';

/**
 * @param {object} ctx
 * @param {string} ctx.structural
 * @param {Record<string, unknown>} ctx.payload
 * @param {string} ctx.traceId
 */
function handlePresence(ctx) {
  const { structural, payload, traceId } = ctx;

  if (structural === 'presence/verify') {
    const token = String(payload.token || '');
    return {
      ok: Boolean(token),
      trace_id: traceId,
      mode: 'resaurce_presence',
    };
  }

  return null;
}

module.exports = { handlePresence };
