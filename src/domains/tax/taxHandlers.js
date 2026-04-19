'use strict';

const { generateTaxDocument } = require('./taxGenerator');
const { appendTaxLifecyclePhases } = require('./taxLvm');

/** @type {Map<string, { status: string, message?: string, document?: Record<string, unknown>, user_id: string, year: number, document_type: string }>} */
const jobsById = new Map();

/** @type {Map<string, Array<Record<string, unknown>>>} tenantKey -> generated catalog rows */
const generatedCatalog = new Map();

function tenantKey(tenant) {
  return tenant && String(tenant).trim() ? String(tenant).trim() : '_';
}

function defaultSeedDocuments() {
  return [
    {
      id: 'doc_tax_w2',
      type: 'tax',
      name: 'W2 Form - 2024',
      description: 'Annual wage and tax statement',
      status: 'available',
    },
    {
      id: 'doc_tax_inv',
      type: 'tax',
      name: 'Investment Gains/Losses - 2024',
      description: 'Summary of investment activity',
      status: 'available',
    },
  ];
}

/**
 * @param {object} ctx
 * @param {string} ctx.structural
 * @param {Record<string, unknown>} ctx.payload
 * @param {string} ctx.traceId
 * @param {string} ctx.tenant
 */
function handleTax(ctx) {
  const { structural, payload, traceId, tenant } = ctx;
  const tk = tenantKey(tenant);

  if (structural === 'tax/documents/list') {
    const seed = defaultSeedDocuments();
    const extra = generatedCatalog.get(tk) || [];
    return {
      ok: true,
      documents: [...seed, ...extra],
      trace_id: traceId,
    };
  }

  if (structural === 'tax/generate/enqueue') {
    const userId = String(payload.user_id ?? payload.userId ?? '');
    const year = Number(payload.year ?? new Date().getFullYear());
    const documentType = String(payload.document_type ?? payload.documentType ?? 'w2');
    const lvmRoute = payload.lvm_route != null ? String(payload.lvm_route) : null;
    const trace = String(payload.trace_id ?? traceId ?? '');
    const sessionId = String(payload.session_id ?? payload.sessionId ?? `tax_sess_${Date.now()}`);
    const jobId = String(payload.job_id ?? payload.jobId ?? `tax_job_${Date.now()}`);

    if (!userId) {
      return { ok: false, error: 'missing_user_id', trace_id: traceId };
    }

    const lvmCtx = {
      session_id: sessionId,
      user_id: userId,
      document_type: documentType,
      lvm_route: lvmRoute || undefined,
    };

    appendTaxLifecyclePhases(trace, ['queued', 'running'], lvmCtx);

    try {
      const document = generateTaxDocument(userId, year, documentType);
      jobsById.set(jobId, {
        status: 'completed',
        message: 'Tax document generated',
        document,
        user_id: userId,
        year,
        document_type: documentType,
      });

      appendTaxLifecyclePhases(trace, ['completed'], lvmCtx);

      const catalogRow = {
        id: `doc_gen_${jobId}`,
        type: 'tax',
        name: `${document.document_type || documentType} — ${year}`,
        description: 'Generated via resaurce Cave',
        status: 'ready',
        generated_at: new Date().toISOString(),
        job_id: jobId,
      };
      const list = generatedCatalog.get(tk) || [];
      list.push(catalogRow);
      generatedCatalog.set(tk, list);

      return {
        ok: true,
        job_id: jobId,
        session_id: sessionId,
        trace_id: trace,
        status: 'completed',
        document,
      };
    } catch (e) {
      appendTaxLifecyclePhases(trace, ['failed'], {
        ...lvmCtx,
        extra: { error: String(e && e.message ? e.message : e), phase: 'failed' },
      });
      jobsById.set(jobId, {
        status: 'failed',
        message: String(e && e.message ? e.message : e),
        user_id: userId,
        year,
        document_type: documentType,
      });
      return {
        ok: false,
        error: 'tax_generation_failed',
        job_id: jobId,
        session_id: sessionId,
        trace_id: trace,
        message: String(e && e.message ? e.message : e),
      };
    }
  }

  if (structural === 'tax/generate/status') {
    const jobId = String(payload.job_id ?? payload.jobId ?? '');
    if (!jobId) return { ok: false, error: 'missing_job_id', trace_id: traceId };
    const job = jobsById.get(jobId);
    if (!job) return { ok: false, error: 'job_not_found', job_id: jobId, trace_id: traceId };
    const progress = job.status === 'completed' ? 100 : job.status === 'failed' ? 0 : 50;
    return {
      ok: true,
      job_id: jobId,
      status: job.status,
      message: job.message || '',
      progress,
      trace_id: traceId,
    };
  }

  if (structural === 'tax/generate/result') {
    const jobId = String(payload.job_id ?? payload.jobId ?? '');
    if (!jobId) return { ok: false, error: 'missing_job_id', trace_id: traceId };
    const job = jobsById.get(jobId);
    if (!job) return { ok: false, error: 'job_not_found', job_id: jobId, trace_id: traceId };
    if (job.status !== 'completed' || !job.document) {
      return { ok: false, error: 'document_not_ready', status: job.status, trace_id: traceId };
    }
    return {
      ok: true,
      job_id: jobId,
      document: job.document,
      trace_id: traceId,
    };
  }

  return null;
}

module.exports = { handleTax, jobsById, generatedCatalog };
