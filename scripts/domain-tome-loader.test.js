'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getLvmEventNamesForStructuralRoute, structuralToTomeRef, reloadTomes, buildStructuralRouteIndex } = require('../src/tome/domainTomeLoader');
const { MUTATING_STRUCTURAL } = require('../src/lvm/caveRouteHooks');

test('structural index includes mutating Cave routes', () => {
  reloadTomes();
  const idx = buildStructuralRouteIndex();
  for (const s of MUTATING_STRUCTURAL) {
    assert.ok(idx.has(s), `missing structural index entry: ${s}`);
    const ref = structuralToTomeRef(s);
    assert.ok(ref && ref.on, s);
    const names = getLvmEventNamesForStructuralRoute(s);
    assert.ok(names.length > 0, `no lvm_events for ${s}`);
  }
});

test('tax generate enqueue indexed for Tome parity', () => {
  reloadTomes();
  assert.ok(structuralToTomeRef('tax/generate/enqueue'));
});
