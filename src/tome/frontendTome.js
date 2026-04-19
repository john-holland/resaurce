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

const MODULE_YAML = path.join(__dirname, '../../tomes/resaurce-frontend/v1/module.yaml');

/**
 * Canonical UI Tome as JSON (for GET /tome/resaurce-frontend).
 */
function loadFrontendTomeJson() {
  if (!fs.existsSync(MODULE_YAML)) {
    return {
      tome_semver: '0.0.0',
      service: 'resaurce',
      surfaces: [],
      allowed_routes: [],
    };
  }
  const raw = fs.readFileSync(MODULE_YAML, 'utf8');
  if (yamlParse) {
    return /** @type {Record<string, unknown>} */ (yamlParse.load(raw));
  }
  return { tome_semver: '0.0.0', service: 'resaurce', raw_yaml: raw };
}

module.exports = { loadFrontendTomeJson, MODULE_YAML };
