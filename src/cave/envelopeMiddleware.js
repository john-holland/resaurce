'use strict';

const { preprocessCaveEnvelope } = require('./router');

/**
 * Express middleware: trace loop guard + message delegation + encapsulation.
 * Mirrors log-view-machine express-cave-adapter createCaveEnvelopeMiddleware.
 */
function createCaveEnvelopeMiddleware(options = {}) {
  return (req, res, next) => {
    const pre = preprocessCaveEnvelope(req.body || {});
    if (!pre.ok) {
      let status = 400;
      if (pre.error === 'unknown_route' || pre.error === 'UNKNOWN_MESSAGE') status = 404;
      else if (pre.error === 'route_not_allowed' || pre.error === 'CAUSAL_LOOP_DETECTED') status = 403;
      return res.status(status).json({ ok: false, ...pre });
    }
    req.caveEnvelope = pre.body;
    next();
  };
}

module.exports = { createCaveEnvelopeMiddleware };
