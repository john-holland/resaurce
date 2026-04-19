'use strict';

/**
 * @param {string} route full route e.g. resaurce:hr/help/request
 * @returns {{ structural: string, explicitService: string | null }}
 */
function parseRoute(route) {
  const r = String(route || '');
  const idx = r.indexOf(':');
  if (idx > 0) {
    const prefix = r.slice(0, idx).toLowerCase();
    return { explicitService: prefix, structural: r.slice(idx + 1) };
  }
  // Path-only routes resolve on this Cave host as resaurce structural paths.
  return { explicitService: 'resaurce', structural: r };
}

module.exports = { parseRoute };
