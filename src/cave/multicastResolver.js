'use strict';

const { loadCaveManifest } = require('./manifestLoader');
const { resolveRouteSpec } = require('./delegationResolver');
const { checkTraceLoop } = require('./traceLoopGuard');

/**
 * Find multicast group triggered by incoming message name.
 * @param {string} message
 */
function findMulticastGroup(message) {
  const manifest = loadCaveManifest();
  const groups = manifest.lvm?.multicast;
  if (!groups || typeof groups !== 'object') return null;
  for (const cfg of Object.values(groups)) {
    if (cfg && cfg.message === message) return cfg;
  }
  return null;
}

function resolveTargetRoute(target, service) {
  const resolved = resolveRouteSpec(target, { service });
  return resolved ? resolved.route : `${service}:${String(target).replace(/^\/+/, '')}`;
}

/**
 * Run server-orchestrated multicast legs after primary handler succeeds.
 * Child legs carry `_multicast_leg: true` to avoid re-entry.
 */
function runMulticastLegs(envelope, primaryResult, dispatchLeg) {
  if (envelope._multicast_leg) return null;
  const message = envelope.message;
  if (!message) return null;

  const group = findMulticastGroup(message);
  if (!group || !Array.isArray(group.targets) || group.targets.length === 0) return null;

  const manifest = loadCaveManifest();
  const service = manifest.service || 'resaurce';
  const mode = group.mode || 'parallel';
  const aggregate = group.aggregate || 'all_ok';

  const runOne = (target) => {
    const route = resolveTargetRoute(target, service);
    const child = {
      ...envelope,
      route,
      message: undefined,
      _multicast_leg: true,
      causation_id: envelope.route || envelope.message,
      causality_path: envelope.causality_path,
    };
    const loop = checkTraceLoop(service, child);
    if (!loop.ok) return { target, ok: false, error: loop.error || 'trace_loop' };
    const out = dispatchLeg(loop.body);
    return { target, route, ok: Boolean(out && out.ok !== false), result: out };
  };

  let legs;
  if (mode === 'sequential') {
    legs = [];
    for (const t of group.targets) legs.push(runOne(t));
  } else {
    legs = group.targets.map(runOne);
  }

  const ok =
    aggregate === 'first_ok'
      ? legs.some((l) => l.ok)
      : aggregate === 'collect_all'
        ? legs.some((l) => l.ok)
        : legs.length > 0 && legs.every((l) => l.ok);

  return {
    multicast: true,
    trace_id: envelope.trace_id,
    aggregate,
    ok,
    primary: primaryResult,
    legs,
  };
}

module.exports = { findMulticastGroup, runMulticastLegs };
