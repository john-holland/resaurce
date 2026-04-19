'use strict';

const fs = require('fs');
const path = require('path');

let yamlParse = null;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  yamlParse = require('js-yaml');
} catch {
  yamlParse = null;
}

/**
 * @param {string} filePath
 * @returns {Record<string, unknown> | null}
 */
function loadYamlFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (yamlParse) {
    return /** @type {Record<string, unknown>} */ (yamlParse.load(raw));
  }
  return null;
}

/**
 * @param {Record<string, unknown>} doc
 * @param {string} transitionOn
 * @returns {string[]}
 */
function lvmEventsForTransition(doc, transitionOn) {
  const transitions = Array.isArray(doc.transitions) ? doc.transitions : [];
  for (const t of transitions) {
    if (t && typeof t === 'object' && t.on === transitionOn) {
      const ev = t.lvm_events;
      if (Array.isArray(ev)) return ev.map(String);
    }
  }
  return [];
}

const REPO_ROOT = path.resolve(__dirname, '../..');
const TOMES_ROOT = path.join(REPO_ROOT, 'tomes');
/** Skip UI bundle tomes when indexing domain LVM fragments. */
const SKIP_DIR_NAMES = new Set(['resaurce-frontend', 'saurce-frontend', 'node_modules', '.git']);

/**
 * Parsed domain Tome YAML documents keyed by absolute filesystem path.
 * Avoids re-reading disk on every mutating Cave route when resolving LVM event names.
 * @type {Map<string, Record<string, unknown>>}
 */
const tomeFileCache = new Map();

/**
 * Structural Cave route (e.g. hr/help/request) → which Tome file + transition `on` key.
 * Built lazily from `structural_routes` on transitions under tomes/** (see plan / SPEC).
 * @type {Map<string, { segments: string[], on: string }>}
 */
let structuralRouteIndex = null;

function tomePath(...segments) {
  return path.join(REPO_ROOT, 'tomes', ...segments);
}

/**
 * @param {string} dir
 * @param {string[]} relSegments path segments under tomes/
 * @param {Array<{ fullPath: string, segments: string[] }>} out
 */
function collectYamlFiles(dir, relSegments, out) {
  if (!fs.existsSync(dir)) return;
  const names = fs.readdirSync(dir);
  for (const name of names) {
    if (name.startsWith('.')) continue;
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      collectYamlFiles(full, [...relSegments, name], out);
    } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
      out.push({ fullPath: full, segments: [...relSegments, name] });
    }
  }
}

/**
 * @returns {Map<string, { segments: string[], on: string }>}
 */
function buildStructuralRouteIndex() {
  /** @type {Map<string, { segments: string[], on: string }>} */
  const index = new Map();
  const files = [];
  collectYamlFiles(TOMES_ROOT, [], files);
  for (const { fullPath, segments } of files) {
    const doc = loadYamlFile(fullPath);
    if (!doc) continue;
    const transitions = Array.isArray(doc.transitions) ? doc.transitions : [];
    for (const t of transitions) {
      if (!t || typeof t !== 'object') continue;
      const on = t.on;
      if (typeof on !== 'string') continue;
      const srs = t.structural_routes;
      if (!Array.isArray(srs)) continue;
      for (const sr of srs) {
        if (typeof sr !== 'string' || !sr.trim()) continue;
        index.set(sr.trim(), { segments, on });
      }
    }
  }
  return index;
}

function ensureStructuralIndex() {
  if (!structuralRouteIndex) {
    structuralRouteIndex = buildStructuralRouteIndex();
  }
  return structuralRouteIndex;
}

/**
 * @param {string} structural
 * @returns {{ segments: string[], on: string } | null}
 */
function structuralToTomeRef(structural) {
  return ensureStructuralIndex().get(structural) || null;
}

/**
 * @param {string} structural
 * @returns {string[]}
 */
function getLvmEventNamesForStructuralRoute(structural) {
  const ref = structuralToTomeRef(structural);
  if (!ref) return [];
  const full = tomePath(...ref.segments);
  let doc = tomeFileCache.get(full);
  if (!doc) {
    doc = loadYamlFile(full);
    if (doc) tomeFileCache.set(full, doc);
  }
  if (!doc) return [];
  return lvmEventsForTransition(doc, ref.on);
}

function reloadTomes() {
  tomeFileCache.clear();
  structuralRouteIndex = null;
}

module.exports = {
  loadYamlFile,
  lvmEventsForTransition,
  getLvmEventNamesForStructuralRoute,
  structuralToTomeRef,
  reloadTomes,
  tomePath,
  buildStructuralRouteIndex,
};
