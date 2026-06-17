'use strict';

const { loadCaveManifest } = require('./manifestLoader');

const SERVICE_ROUTE_RE = /^([a-z][a-z0-9_]*):(.+)$/;

function resolveRouteSpec(spec, ctx) {
  const raw = typeof spec === 'string' ? spec : spec?.route;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const m = SERVICE_ROUTE_RE.exec(trimmed);
  if (m) {
    return { route: trimmed, structural: m[2].replace(/^\/+/, ''), explicitService: m[1] };
  }
  if (trimmed.startsWith('../')) {
    const structural = trimmed.slice(3).replace(/^\/+/, '');
    return { route: `${ctx.service}:${structural}`, structural, explicitService: ctx.service };
  }
  const structural = trimmed.replace(/^\/+/, '');
  return { route: `${ctx.service}:${structural}`, structural, explicitService: ctx.service };
}

function resolveMessageRoute(messageName, manifest) {
  const service = manifest.service || 'resaurce';
  const ctx = { service };
  if (!messageName) return { ok: false, error: 'UNKNOWN_MESSAGE' };

  const structural = manifest.cave?.structural;
  if (structural) {
    for (const key of Object.keys(structural)) {
      const msgs = structural[key]?.messages;
      if (msgs && msgs[messageName] != null) {
        const resolved = resolveRouteSpec(msgs[messageName], ctx);
        if (resolved) return { ok: true, ...resolved };
      }
    }
  }

  for (const [tomeKey, tome] of Object.entries(manifest.tomes || {})) {
    if (tomeKey === 'frontend') continue;
    const msgs = tome?.messages;
    if (msgs && msgs[messageName] != null) {
      const resolved = resolveRouteSpec(msgs[messageName], ctx);
      if (resolved) return { ok: true, ...resolved };
    }
  }

  const rootSpec = manifest.messages?.[messageName];
  if (rootSpec != null) {
    const resolved = resolveRouteSpec(rootSpec, ctx);
    if (resolved) return { ok: true, ...resolved };
  }

  return { ok: false, error: 'UNKNOWN_MESSAGE' };
}

/**
 * Apply message delegation to envelope; returns mutated body or error object.
 */
function applyMessageDelegation(body) {
  const message = body.message;
  if (!message) return { ok: true, body };

  const manifest = loadCaveManifest();
  const resolved = resolveMessageRoute(message, manifest);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error || 'UNKNOWN_MESSAGE', message };
  }

  const next = { ...body, route: resolved.route };
  return { ok: true, body: next, resolved };
}

function isRouteAllowed(route, manifest) {
  const allowed = manifest.encapsulation?.allowed_routes;
  if (!Array.isArray(allowed) || allowed.length === 0) return true;
  return allowed.includes(route);
}

module.exports = {
  resolveRouteSpec,
  resolveMessageRoute,
  applyMessageDelegation,
  isRouteAllowed,
};
