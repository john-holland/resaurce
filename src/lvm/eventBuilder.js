'use strict';

/**
 * @param {string} type
 * @param {string} traceId
 * @param {Record<string, unknown>} [data]
 */
function lvm20Event(type, traceId, data = {}) {
  return {
    schema: 'lvm2.0',
    type,
    trace_id: traceId,
    ts: new Date().toISOString(),
    ...data,
  };
}

module.exports = { lvm20Event };
