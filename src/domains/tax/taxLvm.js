'use strict';

const { appendInternal } = require('../../lvm/appendStore');

/**
 * LVM2.0 tax lifecycle events aligned with inventory log_view_machine.lvm_events.tax_document_lifecycle_events
 * (nested payload; event_type key matches Python LvmEvent.as_dict).
 *
 * @param {string} phase queued|running|completed|failed
 * @param {string} traceId
 * @param {{ session_id: string, user_id: string, document_type: string, lvm_route?: string|null, extra?: Record<string, unknown> }} ctx
 */
function buildTaxLifecycleEvent(phase, traceId, ctx) {
  const p = String(phase).toLowerCase();
  const typeMap = {
    queued: 'TaxDocumentJobQueued',
    running: 'TaxDocumentJobRunning',
    completed: 'TaxDocumentJobCompleted',
    failed: 'TaxDocumentJobFailed',
  };
  const eventType = typeMap[p] || 'TaxDocumentLifecycle';
  const body = {
    session_id: ctx.session_id,
    user_id: ctx.user_id,
    document_type: ctx.document_type,
    phase: p,
  };
  if (ctx.lvm_route) body.lvm_route = ctx.lvm_route;
  if (ctx.extra && typeof ctx.extra === 'object') Object.assign(body, ctx.extra);
  if (p === 'failed' && ctx.extra && ctx.extra.error) body.error = ctx.extra.error;
  return {
    schema: 'lvm2.0',
    event_type: eventType,
    trace_id: traceId,
    ts: new Date().toISOString(),
    payload: body,
  };
}

/**
 * Append tax lifecycle phases to in-memory LVM store (same trace_id as Cave envelope).
 * @param {string} traceId
 * @param {string[]} phases
 * @param {{ session_id: string, user_id: string, document_type: string, lvm_route?: string|null, extra?: Record<string, unknown> }} ctx
 */
function appendTaxLifecyclePhases(traceId, phases, ctx) {
  if (!traceId || !phases.length) return;
  const events = phases.map((ph) => buildTaxLifecycleEvent(ph, traceId, ctx));
  appendInternal(traceId, events);
}

module.exports = { buildTaxLifecycleEvent, appendTaxLifecyclePhases };
