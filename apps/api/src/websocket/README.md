Purpose
-------
This directory is reserved for WebSocket-related source files (e.g., connection handling, event routing, and message schemas) for the API. It complements the compiled output found under `apps/api/dist/websocket/`.

Status
------
Currently no TypeScript sources are present. When implementing WebSocket features, place the sources here (for example, `handler.ts`) so they compile to `dist/websocket/`.

Notes
-----
- Keep module boundaries clear (connection handling vs. domain events).
- Prefer small, cohesive modules with explicit exports.
- Align any shared types with `packages/shared`.


