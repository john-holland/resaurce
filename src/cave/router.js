'use strict';

const { getResaurceRouteInterpreter } = require('./xstate/resaurceRouteRegistry');
const { afterCaveRouteMutation } = require('../lvm/caveRouteHooks');
const { runCaveRoutePipeline } = require('./caveRoutePipeline');
const { applyMessageDelegation, isRouteAllowed } = require('./delegationResolver');
const { checkTraceLoop } = require('./traceLoopGuard');
const { loadCaveManifest } = require('./manifestLoader');
const { runMulticastLegs } = require('./multicastResolver');

/**
 * Pre-process envelope: trace loop, message delegation, encapsulation.
 */
function preprocessCaveEnvelope(body) {
  const manifest = loadCaveManifest();
  const service = manifest.service || 'resaurce';

  const loop = checkTraceLoop(service, body);
  if (!loop.ok) return loop;
  let envelope = loop.body;

  const delegated = applyMessageDelegation(envelope);
  if (!delegated.ok) return delegated;
  envelope = delegated.body;

  const route = String(envelope.route || '');
  if (process.env.RESAURCE_ENFORCE_ALLOWED_ROUTES === '1' && route && !isRouteAllowed(route, manifest)) {
    return { ok: false, error: 'route_not_allowed', route };
  }

  return { ok: true, body: envelope };
}

/**
 * @param {{ route?: string, message?: string, payload?: Record<string, unknown>, trace_id?: string, tenant?: string }} body
 * @param {{ skipPreprocess?: boolean }} [opts]
 */
function handleCaveRoute(body, opts = {}) {
  const pre = opts.skipPreprocess ? { ok: true, body } : preprocessCaveEnvelope(body);
  if (!pre.ok) return pre;

  const pipeline = runCaveRoutePipeline(pre.body);
  const { structural, route, payload, traceId, tenant, explicitService } = pipeline.ctx;

  if (explicitService !== 'resaurce') {
    return { ok: false, error: 'unknown_route', route };
  }

  const ctx = { structural, route, payload, traceId, tenant, message: pre.body.message };
  const routed = getResaurceRouteInterpreter().dispatch(ctx);
  let out = routed && routed.response != null ? routed.response : null;

  if (!out) {
    return { ok: false, error: 'unknown_route', route };
  }

  out = afterCaveRouteMutation(ctx, out);

  if (out && out.ok !== false) {
    const multicast = runMulticastLegs(pre.body, out, (legBody) => {
      const legPre = preprocessCaveEnvelope(legBody);
      if (!legPre.ok) return legPre;
      const legPipeline = runCaveRoutePipeline(legPre.body);
      const legCtx = {
        structural: legPipeline.ctx.structural,
        route: legPipeline.ctx.route,
        payload: legPipeline.ctx.payload,
        traceId: legPipeline.ctx.traceId,
        tenant: legPipeline.ctx.tenant,
        message: legPre.body.message,
      };
      const legRouted = getResaurceRouteInterpreter().dispatch(legCtx);
      let legOut = legRouted && legRouted.response != null ? legRouted.response : { ok: false };
      return afterCaveRouteMutation(legCtx, legOut);
    });
    if (multicast) {
      return { ...out, multicast };
    }
  }

  return out;
}

module.exports = { handleCaveRoute, preprocessCaveEnvelope };
