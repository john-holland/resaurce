'use strict';

const fs = require('fs');
const path = require('path');
const { parseRoute } = require('./paths');

const MANIFEST_PATH = path.join(__dirname, '../../contracts/lvm2/resaurce-machines.json');

/** @type {Record<string, unknown> | null} */
let cachedManifest = null;

function getCaveRouteManifest() {
  if (!cachedManifest) {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    cachedManifest = JSON.parse(raw);
  }
  return cachedManifest;
}

/**
 * Resolve LVM2 manifest machine id for a structural route (exact match on structural_routes, else prefix).
 * @param {string} structural
 * @returns {string | null}
 */
function structuralToMachineId(structural) {
  const doc = getCaveRouteManifest();
  const machines = Array.isArray(doc.machines) ? doc.machines : [];
  for (const row of machines) {
    const routes = Array.isArray(row.structural_routes) ? row.structural_routes : [];
    if (routes.includes(structural)) return typeof row.id === 'string' ? row.id : null;
  }
  for (const row of machines) {
    const prefixes = Array.isArray(row.prefixes) ? row.prefixes : [];
    for (const pref of prefixes) {
      if (structural === pref || structural.startsWith(pref)) {
        return typeof row.id === 'string' ? row.id : null;
      }
    }
  }
  return null;
}

/**
 * Parse envelope and attach manifest metadata (same source as GET /lvm2/discover).
 * @param {{ route: string, payload?: Record<string, unknown>, trace_id?: string, tenant?: string }} body
 */
function runCaveRoutePipeline(body) {
  const route = String(body.route || '');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const traceId = String(body.trace_id || '');
  const tenant = body.tenant != null ? String(body.tenant) : '';
  const { structural, explicitService } = parseRoute(route);
  const machineId = explicitService === 'resaurce' ? structuralToMachineId(structural) : null;
  return {
    ctx: { structural, route, payload, traceId, tenant, explicitService },
    machineId,
    manifestService: typeof getCaveRouteManifest().service === 'string' ? getCaveRouteManifest().service : 'resaurce',
  };
}

function reloadRouteManifestCache() {
  cachedManifest = null;
}

module.exports = {
  getCaveRouteManifest,
  structuralToMachineId,
  runCaveRoutePipeline,
  reloadRouteManifestCache,
  MANIFEST_PATH,
};
