# resaurce

Node/Express **Cave** HTTP host for **HR**, **tax documents**, **legal/compliance**, and **presence** routes consumed by [inventory](https://github.com/john-holland/inventory) and related clients. Business logic is split under `src/domains/`; domain **Tomes** live in `tomes/`; **LVM2.0** events append to an in-memory store (or forward via `LVM_FORWARD_URL`).

## Run locally

```bash
npm install
npm start
# listens on PORT (default 3456)
```

### Tax document generation (strategy)

Tax jobs are implemented **in Node** inside this service (`src/domains/tax/`) so Cave handling and **LVM2.0 tax lifecycle events** stay on one writer (no duplicate append from the legacy Python CLI). Numeric behavior mirrors the sibling inventory module `backend/python-apis/tax-processing/tax_documents.py` (W2 / 1099-C / investment summaries). If you need exact numpy parity later, add contract tests or optionally subprocess the script behind a feature flag.

- **Module Federation remote (HR chat shell):** after `npm run build:hr-remote`, static files are served under `/remote/` (e.g. [http://127.0.0.1:3456/remote/remoteEntry.js](http://127.0.0.1:3456/remote/remoteEntry.js)) for the inventory host to consume.
- **UI module (standalone):** open [http://127.0.0.1:3456/app/](http://127.0.0.1:3456/app/) — static SPA that loads `GET /tome/resaurce-frontend` then calls `POST /cave/route` only.
- **UI Tome JSON:** `GET /tome/resaurce-frontend`

Point inventory at this origin:

```bash
export REACT_APP_SOA_RES_AURCE_URL=http://127.0.0.1:3456
```

### Optional environment

| Variable | Purpose |
|----------|---------|
| `LVM_FORWARD_URL` | If set, `POST /lvm/append` also forwards the same body to `{base}/lvm/append` (central ingest). |
| `RESAURCE_CORS_ORIGINS` | Comma-separated allowed `Origin` values, or `*`, for browser hosts (e.g. inventory on another port) fetching the UI Tome or calling Cave cross-origin. |
| `RESAURCE_ENFORCE_ALLOWED_ROUTES` | Set to `1` to reject `POST /cave/route` when `route` is not listed in the UI Tome `allowed_routes`. |
| `RESAURCE_DEV_MOCK_USER` | Set to `1` in **development only** so `POST /cave/route` envelopes missing `tenant` / `presence` get dev placeholders (`tenant: dev`, `presence: mock-presence-dev`). The server logs a warning on startup. Never enable in production. |
| `SOA_SAURCE_URL` / `RESAURCE_SAURCE_URL` | Optional base URL for the sibling **saurce** Cave host. Used only by narrow outbound helpers (see `src/saurce/saurceOutbound.js`), not for generic proxying. |

Build the federated HR remote before relying on `/remote/`:

```bash
npm run build:hr-remote
```

## Contracts

- Vendored from inventory (re-sync when contracts change): `contracts/schemas/envelope-v2.json`, `contracts/pacts/inventory-frontend-resaurce-cave.json`, `contracts/schemas/resaurce-frontend-tome-v1.json`.
- Re-sync: from inventory repo run `scripts/sync-cave-contracts-to-siblings.sh` (copy pact + envelope; re-copy `resaurce-frontend-tome-v1.json` manually if it changes only in resaurce).

## Tests

```bash
npm run test:smoke
npm run verify:pact
```

## HTTP surface

| Method / path | Purpose |
|---------------|---------|
| `POST /cave/route` | Cave envelope v2 (`schema_version`, `message` or `route`, `payload`, `trace_id`, …). Message names resolve via `cave.manifest.yaml`. |
| `POST /lvm/append` | Body `{ "trace_id", "events": [...] }` — stored and optionally forwarded. |
| `GET /cave/manifest` | Authoritative **Cave manifest** (`cave.manifest.yaml`) — messages, tomes, LVM machines, robotcopy flows. |
| `GET /cave/federation` | Static federation slice only (surfaces, assets, MF remotes — no routing tables). |
| `GET /tome/resaurce-frontend` | Same static slice as `/cave/federation` (Module Federation / UI shell). |
| `GET /lvm2/discover` | LVM machine metadata projected from `cave.manifest.yaml` (`contracts/lvm2/*.json` is deprecated). |
| `GET /app/*` | Service-hosted SPA static assets. |
| `GET /remote/*` | Webpack Module Federation build from `hr-remote/` (`remoteEntry.js` and chunks). |
| `GET /health` | Liveness. |

## Routes (structural path after `resaurce:`)

| Route | Purpose |
|-------|---------|
| `hr/help/request` | HR help session allocation (inventory `HRHelpService` via `hrResaurceBridge`) |
| `hr/help/session` | Pact contract surface (same response envelope) |
| `hr/employees/available` | List mock HR staff (skills filter); used by RobotCopy flows from the UI Tome |
| `hr/chat/room/create` | Create in-memory chat room |
| `hr/chat/message/send` | Append message to room |
| `hr/chat/messages/list` | List messages for room |
| `tax/documents/list` | Tax document catalog (seed + generated rows per tenant) |
| `tax/generate/enqueue` | Run tax generation (sync); append `TaxDocumentJob*` LVM events |
| `tax/generate/status` | Job status by `job_id` |
| `tax/generate/result` | Completed document JSON by `job_id` |
| `legal/document/review` | Legal document review queue |
| `presence/verify` | Presence token check |

## Tomes

| Path | Role |
|------|------|
| `tomes/hr/v1/help.yaml` | HR help state / `lvm_events` for Cave route hooks |
| `tomes/legal/v1/review.yaml` | Legal review transition → LVM |
| `tomes/presence/v1/verify.yaml` | Presence verify transition → LVM |
| `tomes/tax/v1/jobs.yaml` | Tax job Tome (structural ref; tax LVM phases emitted in `taxHandlers` + `taxLvm.js`) |
| `tomes/resaurce-frontend/v1/module.yaml` | **UI Tome** — surfaces, `allowed_routes`, semver |

## Pact provider verification

```bash
npm run verify:pact
```
