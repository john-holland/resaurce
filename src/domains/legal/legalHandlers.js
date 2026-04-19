'use strict';

/**
 * @param {object} ctx
 * @param {string} ctx.structural
 * @param {Record<string, unknown>} ctx.payload
 * @param {string} ctx.traceId
 */
function handleLegal(ctx) {
  const { structural, payload, traceId } = ctx;

  if (structural === 'legal/document/review') {
    return {
      ok: true,
      review_id: `rev_${Date.now()}`,
      status: 'queued',
      document_id: payload.document_id,
      trace_id: traceId,
    };
  }

  return null;
}

module.exports = { handleLegal };
