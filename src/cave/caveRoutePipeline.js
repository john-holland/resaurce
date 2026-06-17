'use strict';

const { parseRoute } = require('./paths');
const { loadCaveManifest } = require('./manifestLoader');

/**
 * Resolve machine id for a structural route from cave.manifest.yaml lvm.machines.
 * @param {string} structural
 */
function structuralToMachineId(structural) {
  const doc = loadCaveManifest();
  const machines = Array.isArray(doc.lvm?.machines) ? doc.lvm.machines : [];
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

function getCaveRouteManifest() {
  const m = loadCaveManifest();
  return {
    service: m.service || 'resaurce',
    machines: m.lvm?.machines || [],
  };
}

/**
 * @param {{ route: string, payload?: Record<string, unknown>, trace_id?: string, tenant?: string }} body
 */
function runCaveRoutePipeline(body) {
  const route = String(body.route || '');
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const traceId = String(body.trace_id || '');
  const tenant = body.tenant != null ? String(body.tenant) : '';
  const { structural, explicitService } = parseRoute(route);
  const machineId = explicitService === 'resaurce' ? structuralToMachineId(structural) : null;
  const manifest = getCaveRouteManifest();
  return {
    ctx: { structural, route, payload, traceId, tenant, explicitService },
    machineId,
    manifestService: manifest.service,
  };
}

function reloadRouteManifestCache() {
  const { reloadManifest } = require('./manifestLoader');
  reloadManifest();
}

module.exports = {
  getCaveRouteManifest,
  structuralToMachineId,
  runCaveRoutePipeline,
  reloadRouteManifestCache,
};
