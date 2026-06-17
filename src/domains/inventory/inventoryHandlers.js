'use strict';

/** @type {Map<string, Array<Record<string, unknown>>>} */
const generatedCatalog = new Map();

/** @type {Map<string, { status: string; report_type: string }>} */
const jobsById = new Map();

function tenantKey(tenant) {
  return tenant && String(tenant).trim() ? String(tenant).trim() : '_';
}

function defaultSeedReports() {
  return [
    {
      id: 'doc_inv_q1',
      type: 'inventory',
      name: 'Inventory Report - Q1 2024',
      description: 'Comprehensive inventory audit report',
      status: 'available',
    },
    {
      id: 'doc_inv_val',
      type: 'inventory',
      name: 'Inventory Valuation Summary',
      description: 'Current inventory value and turnover metrics',
      status: 'available',
    },
  ];
}

/**
 * @param {object} ctx
 */
function handleInventory(ctx) {
  const { structural, payload, traceId, tenant } = ctx;
  const tk = tenantKey(tenant);

  if (structural === 'inventory/report/list') {
    const seed = defaultSeedReports();
    const extra = generatedCatalog.get(tk) || [];
    return { ok: true, documents: [...seed, ...extra], trace_id: traceId };
  }

  if (structural === 'inventory/report/enqueue') {
    const reportType = String(payload.report_type ?? payload.reportType ?? 'quarterly');
    const jobId = String(payload.job_id ?? payload.jobId ?? `inv_job_${Date.now()}`);
    jobsById.set(jobId, { status: 'completed', report_type: reportType });

    const catalogRow = {
      id: `doc_gen_${jobId}`,
      type: 'inventory',
      name: `Inventory Report — ${reportType}`,
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

  return null;
}

module.exports = { handleInventory, jobsById, generatedCatalog };
