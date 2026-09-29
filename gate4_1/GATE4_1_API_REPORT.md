# GATE4_1_API_REPORT — Phase N (OpenAPI)

Generated: 2026-09-29

## Audit result (before fixes)
- 15 controller classes / 91 route handlers (`25 @Get + 64 @Post`, zero PUT/PATCH/DELETE by design: state transitions are POST actions).
- **0/15 controllers carried explicit OpenAPI decorators**; `@nestjs/swagger` v11 is wired programmatically in `main.ts` (DocumentBuilder, 12 tags, bearer auth) and the doc is generated purely by TS reflection at `/docs` (E9 asserts path coverage for `/listings`, `/commission`, `/billing`, `/ads`, `/search`, `/media`, `/auth/mfa`).
- No committed spec artifact existed.

## Gate 4.1 changes
1. **Committed spec artifact**: `backend/apps/api/openapi.json` — generated from the real module graph (`apps/api/scripts-ci/dump-openapi.js`): **90 paths / 93 operations**.
2. **Contract-drift protection ACTIVE**: CI step regenerates the document and `diff -u` fails the build on drift (Phase N mandate: "OpenAPI باید از Implementation عقب نماند. Contract Drift باید CI failure شود.").
3. Reversal endpoint added → `POST /api/v1/commission/calculations/:id/reversals` present in the regenerated contract.

## Registered remaining depth (honest)
- Per-endpoint `summary/description/examples/typed error responses` via decorators remain thin (reflection-only schemas; class-validator constraints are not reflected into OpenAPI schemas). Enrichment scheduled Gate 5 (registered in Phase E table item 14 and OPEN_ISSUES). Status codes are uniform via the code-based error model (`{error:{code,message,requestId}}`), which the doc describes globally.
- Pagination envelope is implemented in list/search endpoints (clamped pagination max 100, bounded keys) and documented in search/listing reports; per-endpoint OpenAPI pagination parameters pending decorator enrichment.

## Verdict
API Contract = **PASS** (drift mechanism active + committed artifact + real implementation match), depth enrichment registered as non-blocking.
