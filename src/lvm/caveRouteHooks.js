'use strict';

const { getLvmEventNamesForStructuralRoute } = require('../tome/domainTomeLoader');
const { lvm20Event } = require('./eventBuilder');
const { appendInternal } = require('./appendStore');

const MUTATING_STRUCTURAL = new Set([
  'hr/help/request',
  'hr/chat/room/create',
  'hr/chat/message/send',
  'legal/document/review',
  'presence/verify',
]);

/**
 * After a successful Cave route, append LVM2.0 events derived from domain Tomes (same trace_id).
 * @param {{ structural: string, traceId: string, tenant: string }} ctx
 * @param {Record<string, unknown>} out handler response
 */
function afterCaveRouteMutation(ctx, out) {
  if (!out || out.ok !== true) return out;
  if (!MUTATING_STRUCTURAL.has(ctx.structural)) return out;

  const names = getLvmEventNamesForStructuralRoute(ctx.structural);
  if (!names.length) return out;

  const events = names.map((type) =>
    lvm20Event(type, ctx.traceId, {
      route: ctx.structural,
      tenant: ctx.tenant || undefined,
      service: 'resaurce',
    })
  );
  appendInternal(ctx.traceId, events);
  return out;
}

module.exports = { afterCaveRouteMutation, MUTATING_STRUCTURAL };
