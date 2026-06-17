'use strict';

const { projectFrontendTomeJson, loadCaveManifest } = require('../cave/manifestLoader');

/**
 * Canonical static federation slice (GET /tome/resaurce-frontend).
 */
function loadFrontendTomeJson() {
  try {
    return projectFrontendTomeJson();
  } catch {
    return {
      tome_semver: '0.0.0',
      service: 'resaurce',
      surfaces: [],
      assets_base: '/app',
      federation: {},
    };
  }
}

module.exports = { loadFrontendTomeJson, loadCaveManifest };
