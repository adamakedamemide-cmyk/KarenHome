# GATE 5 — Phase M: Contracts Audit

Status: **PARTIAL**. Two separate subdomains must not be conflated:

## 1. User agreements (REAL, verified)
- `legal/user_agreement_acceptances` with `ON CONFLICT DO NOTHING` — an acceptance is append-only and immutable.
- `LegalAgreementsService.hasAccepted` uses `agreement_version >= $N` — forward-compatible, never rewritten.
- Guard-protected (`AccessTokenGuard`), wired into the publication policy suite (`g4-publication-policy.spec` PASS on fresh G5 DB).

## 2. Contracts proper (template/contract/version/party/property/signature/status/audit)
- Database: 6 `legal.*` tables exist (contracts, contract_templates, template_versions, contract_parties, contract_signatures, contract_audit — schema-complete).
- Application layer: **absent** (no repository, service, API, events, workers, tests — grep-verified).

## Mandated immutability test (Version 1 → Version 2 must not overwrite V1)
NOT_EXECUTABLE for contracts proper (nothing to test). For the implemented agreement subdomain, immutability IS enforced and tested: duplicate acceptance of the same version is a no-op, and versions are independent rows (never updated in place). The full contract-version immutability test suite is a mandatory acceptance criterion registered in GATE5_NEXT_GATE.md.
