'use strict';

/** @type {Map<string, Array<Record<string, unknown>>>} */
const generatedCatalog = new Map();

/** @type {Map<string, { status: string; document_id: string }>} */
const jobsById = new Map();

function tenantKey(tenant) {
  return tenant && String(tenant).trim() ? String(tenant).trim() : '_';
}

function defaultSeedDocuments() {
  return [
    {
      id: 'doc_legal_tos',
      type: 'legal',
      name: 'Terms of Service',
      description: 'Platform terms and conditions',
      status: 'ready',
      generated_at: '2024-01-15',
    },
    {
      id: 'doc_legal_privacy',
      type: 'legal',
      name: 'Privacy Policy',
      description: 'Data handling and privacy commitments',
      status: 'ready',
      generated_at: '2024-01-15',
    },
    {
      id: 'doc_legal_mission',
      type: 'legal',
      name: 'Mission Statement',
      description: 'Company mission and values',
      status: 'available',
    },
  ];
}

/**
 * @param {object} ctx
 */
function handleLegal(ctx) {
  const { structural, payload, traceId, tenant } = ctx;
  const tk = tenantKey(tenant);

  if (structural === 'legal/documents/list') {
    const seed = defaultSeedDocuments();
    const extra = generatedCatalog.get(tk) || [];
    return { ok: true, documents: [...seed, ...extra], trace_id: traceId };
  }

  if (structural === 'legal/document/enqueue') {
    const documentId = String(payload.document_id ?? payload.documentId ?? `legal_${Date.now()}`);
    const documentType = String(payload.document_type ?? payload.documentType ?? 'review');
    const jobId = String(payload.job_id ?? payload.jobId ?? `legal_job_${Date.now()}`);
    jobsById.set(jobId, { status: 'completed', document_id: documentId });

    const catalogRow = {
      id: documentId,
      type: 'legal',
      name: `Legal Document — ${documentType}`,
      description: 'Generated via resaurce Cave',
      status: 'ready',
      generated_at: new Date().toISOString(),
      job_id: jobId,
    };
    const list = generatedCatalog.get(tk) || [];
    list.push(catalogRow);
    generatedCatalog.set(tk, list);

    return { ok: true, job_id: jobId, status: 'completed', trace_id: traceId };
  }

  if (structural === 'legal/document/review') {
    return {
      ok: true,
      review_id: `rev_${Date.now()}`,
      status: 'queued',
      document_id: payload.document_id,
      trace_id: traceId,
    };
  }

  return null;
}

module.exports = { handleLegal, jobsById, generatedCatalog };
