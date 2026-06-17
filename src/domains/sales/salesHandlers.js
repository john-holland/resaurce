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
      id: 'doc_sales_jan',
      type: 'sales',
      name: 'Sales Report - January 2024',
      description: 'Monthly sales and revenue analysis',
      status: 'available',
    },
    {
      id: 'doc_sales_q1',
      type: 'sales',
      name: 'Sales Report - Q1 2024',
      description: 'Quarterly revenue and margin summary',
      status: 'available',
    },
  ];
}

/**
 * @param {object} ctx
 */
function handleSales(ctx) {
  const { structural, payload, traceId, tenant } = ctx;
  const tk = tenantKey(tenant);

  if (structural === 'sales/report/list') {
    const seed = defaultSeedReports();
    const extra = generatedCatalog.get(tk) || [];
    return { ok: true, documents: [...seed, ...extra], trace_id: traceId };
  }

  if (structural === 'sales/report/enqueue') {
    const reportType = String(payload.report_type ?? payload.reportType ?? 'monthly');
    const jobId = String(payload.job_id ?? payload.jobId ?? `sales_job_${Date.now()}`);
    jobsById.set(jobId, { status: 'completed', report_type: reportType });

    const catalogRow = {
      id: `doc_gen_${jobId}`,
      type: 'sales',
      name: `Sales Report — ${reportType}`,
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

module.exports = { handleSales, jobsById, generatedCatalog };
