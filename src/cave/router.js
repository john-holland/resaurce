'use strict';

const { getResaurceRouteInterpreter } = require('./xstate/resaurceRouteRegistry');
const { afterCaveRouteMutation } = require('../lvm/caveRouteHooks');
const { runCaveRoutePipeline } = require('./caveRoutePipeline');

/**
 * @param {{ route: string, payload?: Record<string, unknown>, trace_id?: string, tenant?: string }} body
 */
function handleCaveRoute(body) {
  const pipeline = runCaveRoutePipeline(body);
  const { structural, route, payload, traceId, tenant, explicitService } = pipeline.ctx;

  if (explicitService !== 'resaurce') {
    return { ok: false, error: 'unknown_route', route };
  }

  const ctx = { structural, route, payload, traceId, tenant };
  const routed = getResaurceRouteInterpreter().dispatch(ctx);
  let out = routed && routed.response != null ? routed.response : null;

  if (!out) {
    return { ok: false, error: 'unknown_route', route };
  }

  out = afterCaveRouteMutation(ctx, out);
  return out;
}

module.exports = { handleCaveRoute };
