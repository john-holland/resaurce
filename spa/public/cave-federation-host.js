var CaveFederationHost = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../inventory/packages/cave-federation-host/src/index.js
  var index_exports = {};
  __export(index_exports, {
    createStructuralCaveClient: () => createStructuralCaveClient,
    readFederationFromUiTome: () => readFederationFromUiTome
  });
  function readFederationFromUiTome(tome) {
    if (!tome || typeof tome !== "object") return { remoteEntryPath: null };
    const fed = (
      /** @type {Record<string, unknown>} */
      tome.federation
    );
    if (!fed || typeof fed !== "object") return { remoteEntryPath: null };
    const path = fed.remote_entry_path;
    const exposes = Array.isArray(fed.exposes) ? fed.exposes.filter((x) => typeof x === "string") : void 0;
    return {
      remoteEntryPath: typeof path === "string" && path.trim() ? path.trim() : null,
      exposes
    };
  }
  function createStructuralCaveClient(options) {
    const base = String(options.baseUrl || "").replace(/\/$/, "");
    const fetchFn = options.fetchImpl || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    if (!base) throw new Error("createStructuralCaveClient: baseUrl required");
    if (!fetchFn) throw new Error("createStructuralCaveClient: fetch not available; pass fetchImpl");
    return {
      baseUrl: base,
      /**
       * @param {string} route full route e.g. resaurce:hr/help/session
       * @param {Record<string, unknown>} payload
       * @param {{ traceId?: string, replyMode?: string, tenant?: string }} [opts]
       */
      async caveRoute(route, payload, opts = {}) {
        const traceId = opts.traceId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `trace-${Date.now()}`);
        const body = {
          schema_version: "2.0",
          route,
          payload: payload || {},
          trace_id: traceId,
          reply_mode: opts.replyMode || "sync_http",
          ...opts.tenant != null ? { tenant: opts.tenant } : {}
        };
        const res = await fetchFn(`${base}/cave/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body)
        });
        let json = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }
        return { status: res.status, json };
      }
    };
  }
  return __toCommonJS(index_exports);
})();
