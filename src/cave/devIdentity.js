'use strict';

/**
 * Dev-only: fill tenant/presence when absent so standalone resaurce works without Inventory/Continuum.
 * Enable with RESAURCE_DEV_MOCK_USER=1 — never use in production.
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
function applyDevMockEnvelope(body) {
  if (process.env.RESAURCE_DEV_MOCK_USER !== '1') return body;
  const out = { ...body };
  if (out.tenant == null || out.tenant === '') {
    out.tenant = 'dev';
  }
  if (out.presence == null || out.presence === '') {
    out.presence = 'mock-presence-dev';
  }
  return out;
}

module.exports = { applyDevMockEnvelope };
