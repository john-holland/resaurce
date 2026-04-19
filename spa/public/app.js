/* global crypto, CaveFederationHost */
(function () {
  const tomeEl = document.getElementById('tome-out');
  const caveEl = document.getElementById('cave-out');

  function traceId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'trace-' + Date.now();
  }

  /** @type {ReturnType<typeof CaveFederationHost.createStructuralCaveClient> | null} */
  let caveClient = null;

  function getCaveClient() {
    if (!caveClient && typeof CaveFederationHost !== 'undefined') {
      caveClient = CaveFederationHost.createStructuralCaveClient({ baseUrl: '' });
    }
    return caveClient;
  }

  async function fetchTome() {
    const res = await fetch('/tome/resaurce-frontend', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Tome HTTP ' + res.status);
    return res.json();
  }

  async function caveRoute(route, payload) {
    const client = getCaveClient();
    if (client) {
      return client.caveRoute(route, payload || {}, { traceId: traceId(), replyMode: 'sync_http' });
    }
    const body = {
      schema_version: '2.0',
      route,
      payload: payload || {},
      trace_id: traceId(),
      reply_mode: 'sync_http',
    };
    const res = await fetch('/cave/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  function showCave(label, result) {
    caveEl.textContent = label + '\n' + JSON.stringify(result, null, 2);
  }

  async function init() {
    try {
      const tome = await fetchTome();
      tomeEl.textContent = JSON.stringify(tome, null, 2);
      window.__RESAURCE_UI_TOME = tome;
      if (typeof CaveFederationHost !== 'undefined') {
        const fed = CaveFederationHost.readFederationFromUiTome(tome);
        window.__RESAURCE_FEDERATION = fed;
      }
    } catch (e) {
      tomeEl.textContent = String(e);
    }
  }

  document.getElementById('btn-session').addEventListener('click', async () => {
    const r = await caveRoute('resaurce:hr/help/session', { employee_id: 'spa-user' });
    showCave('hr/help/session', r);
  });
  document.getElementById('btn-request').addEventListener('click', async () => {
    const r = await caveRoute('resaurce:hr/help/request', {
      userId: 'spa-user',
      context: 'standalone module',
      skillsRequired: ['documents'],
      urgency: 'low',
    });
    showCave('hr/help/request', r);
  });
  document.getElementById('btn-legal').addEventListener('click', async () => {
    const r = await caveRoute('resaurce:legal/document/review', {
      document_id: 'doc-spa-1',
      user_id: 'spa-user',
    });
    showCave('legal/document/review', r);
  });

  init();
})();
