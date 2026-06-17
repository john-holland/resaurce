'use strict';

const fs = require('fs');
const path = require('path');

let yamlParse = null;
try {
  yamlParse = require('js-yaml');
} catch {
  yamlParse = null;
}

const MANIFEST_PATH = path.join(__dirname, '../../cave.manifest.yaml');

let _cached = null;

function loadCaveManifest() {
  if (_cached) return _cached;
  if (!fs.existsSync(MANIFEST_PATH)) {
    _cached = { service: 'resaurce', messages: {}, tomes: {} };
    return _cached;
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  if (yamlParse) {
    _cached = yamlParse.load(raw);
    return _cached;
  }
  _cached = { service: 'resaurce', raw_yaml: raw };
  return _cached;
}

function projectFrontendTomeJson() {
  const m = loadCaveManifest();
  const frontend = m.tomes?.frontend || {};
  return {
    tome_semver: frontend.tome_semver || '1.0.0',
    service: m.service || 'resaurce',
    surfaces: frontend.surfaces || [],
    assets_base: frontend.assets_base || '/app',
    federation: frontend.federation || {},
  };
}

function projectLvm2Discover() {
  const m = loadCaveManifest();
  const machines = m.lvm?.machines || [];
  return {
    service: m.service || 'resaurce',
    schema_version: 'lvm2.node_cave_manifest/1',
    machines: machines.map((mc) => ({
      id: mc.id,
      prefixes: mc.prefixes || [],
      structural_routes: mc.structural_routes || [],
      xstate_states: ['idle', 'done'],
      xstate_events: ['ROUTE'],
    })),
  };
}

function reloadManifest() {
  _cached = null;
  return loadCaveManifest();
}

module.exports = {
  loadCaveManifest,
  projectFrontendTomeJson,
  projectLvm2Discover,
  reloadManifest,
  MANIFEST_PATH,
};
