# Deprecated — authoritative machine metadata lives in `cave.manifest.yaml` (`lvm.machines`).

Runtime projection is served at `GET /lvm2/discover` (generated from manifest via `projectLvm2Discover()`).

This JSON file is retained for contract tests and smoke scripts only; do not edit for routing changes.
