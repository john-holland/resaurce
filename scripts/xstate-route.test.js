'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleCaveRoute } = require('../src/cave/router');

test('hr help session via interpreter', () => {
  const out = handleCaveRoute({
    schema_version: '2.0',
    route: 'resaurce:hr/help/session',
    payload: {},
    trace_id: 'unit-hr',
  });
  assert.equal(out.ok, true);
});

test('unknown hr subroute returns unknown_route', () => {
  const out = handleCaveRoute({
    schema_version: '2.0',
    route: 'resaurce:hr/not-real',
    payload: {},
    trace_id: 'unit-hr2',
  });
  assert.equal(out.ok, false);
});
