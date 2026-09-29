# Worklog — Karen Home

---
Task ID: SESSION-RECOVERY
Agent: Main Agent (W0-Finalize + Gate 3-DB Orchestrator)
Task: بازیابی محیط پس از sandbox reset و اجرای W0 Finalization + Gate 3-DB طبق دستور جدید کاربر

Work Log:
- Sandbox reset: همه محصولات قبلی (gate0/gate0-r/w0، w0-work، micromamba) از بین رفتند؛ git فقط initial commit داشت.
- Reference Bundle دوباره دانلود شد: tmpfiles → صفحه HTML → لینک مستقیم downloads.zip (351,458B)؛ SHA-256 = af3a60e5af59fc1f90fe9c5edfd9e5dddd8afe8faf4d0de49baf3c5c00b4982a (بایت‌به‌بایت = رکورد Gate 0-R).
- Master Prompt SHA bcdebe3ad069a754bafbc6ed6e464195596074787625549801c0fe025ca4d1b6 و Reference_Artifacts_v1.zip SHA 9c43fec79fdada593344606bf01c4ec7ac461f00cf0b2a5f5e4b37c62ebf8a63 — هر دو منطبق با سوابق.
- استخراج بازگشتی: 360 فایل؛ ساختار 00_schema_and_freeze / 01_backend_contract / 02_backend_skeleton / 03_backend_gate1 / 04_backend_gate2 / 99_original_archives.
- w0-work/backend از 04_backend_gate2 بازسازی شد (database/base + errata 0024/0025/0026 + verify).
- محیط: micromamba 2.9 → env «karen» = PostgreSQL 16.10 + PostGIS 3.5.0 (GEOS 3.13, PROJ 9.5.1) + Redis (PONG) + pnpm 10.15.0 (npm -g) + Node v24.21.0.
- DBها: karen_ere (اصلی) و karen_g3_scratch ساخته شدند؛ postgis extension فعال.
- توجه: ۱۹ فیکس typecheck جلسه قبل از دست رفت — باید دوباره از طریق اجرای واقعی typecheck کشف و اعمال شوند.

Stage Summary:
- محیط و منابع بازیابی شد؛ آماده اجرای W0-Finalize (تصویب OD-01/02/03/04/08/09/13 + ADR + lint + Reference Snapshot) و سپس Gate 3-DB (0027..0031).
- تصمیمات کاربر: CR-05=false positive (رسمی)، گزارش‌های build قبلی=Historical Evidence، Execution Evidence جدید ملاک اعتبار.

---
Task ID: W0-FINALIZE + GATE3-DB
Agent: Main Agent
Task: W0 Finalization (7 OD approvals + 10 items) ثم Gate 3-DB execution per user mandate

Work Log:
- استرداد كامل بعد sandbox reset: إعادة تنزيل Bundle (SHA مطابق af3a60e5…)، بناء PG16.10+PostGIS3.5+Redis+pnpm، إعادة بناء w0-work/backend، إعادة تشغيل typecheck/build/test (5/5, 9/9) بعد ~12 إصلاح نوعي (exactOptionalPropertyTypes guards, noUncheckedIndexedAccess guards, jest.fn typing, jose ESM via babel dual-transform + pnpm-aware transformIgnorePatterns 'node_modules/(?!.*jose)').
- pnpm lint عُرّف (eslint9+ts-eslint8, typed linting, projectService) ويجري 0 problems.
- Reference Bundle أُرشف في docs/reference/ مع SHA-256 وقراءة قواعد (OD-01 hierarchy).
- ADR-0010..0017 كُتبت كاملة (provenance disclosed للـ0001..0009).
- W0_OPEN_DECISIONS محدّث: OD-01/02/03/04/08/09/13 = APPROVED؛ CR-05=false positive رسمياً؛ 0024 مقبول 0-ERROR؛ تقارير build التاريخية = Historical Evidence.
- مهاجرات 0027..0031 (كما حدد المستخدم) + seed_reference (26 perm/83 mapping، صفر قيم تجارية) + runner (apply-all-migrations.sh مع ledger).
- G3-CF-02: date_trunc IMMUTABLE failure ← UTC cast. G3-CF-01 (CRITICAL): دالة frozen صلبة 10-state كانت ستمنع الحالات الجديدة ← CREATE OR REPLACE موحّد عبر OD-13 في 0031 (سابقة 0024) + مصفوفة 33 قاعدة configurable.
- Fresh apply 10 خطوات = 0 ERROR (karen_g3_fresh). g3-verification = 37/37 PASS. g3-concurrency (C1 budget race / C2 outbox SKIP LOCKED / C3 transition race) = 3/3 PASS. jest مع RUN_DB_TESTS=1 ضد القاعدة المهاجرة = خضراء.
- Schema diff حقيقي: ADDED 27T/232C/3E/8F/54I/13TRG/2V؛ REMOVED=0. Snapshot: pg_dump 8568 سطر SHA f79a3348….
- W0 = PASS (Finalized). Gate 3-DB = PASS. لا دخول لأي Gate جديد بدون أمر.

Stage Summary:
- المخرجات: download/w0/{W0_OPEN_DECISIONS.md, W0_FINALIZATION.md} + download/w0/gate3/ (تقرير GATE3_DB_EXECUTION_REPORT + migrations + adr + evidence + schema snapshot) + docs/reference داخل w0-work/backend.
---
Task ID: GATE4
Agent: Main Agent (Gate 4 Orchestrator)
Task: اجرای کامل Gate 4 — Core Backend, Application Domain, Workers & Platform Infrastructure طبق دستور کاربر (۲۸ بند)

Work Log:
- W0/Gate3 results registered as Reported Execution Evidence (per user directive). Baseline tagged gate3-db-final (df45d69).
- Migrations 0032/0033/0034 (jobs+DLQ, agreements, quiet hours+org prefs, anti-bot, search state+PG FTS docs, media pipeline columns, IAM hardening, billing plans) — fresh chain 13/13 steps, 0 ERROR.
- Shared kernel: DomainError code model (§18) + en/ru catalog + localization filter; Prometheus metrics + structured logs + request/trace IDs + rate limiting (auth 10/min).
- IAM hardening: email/phone verification, password flows, MFA TOTP (RFC6238, AES-256-GCM at rest), OAuth google/facebook abstraction, logout-all, login telemetry; permission engine switched to iam.effective_permissions (0030).
- Listing: TS machine aligned to 13 states/33 rules (0031), 14 transition actions, publication policy (10 checks) enforced server-side; property location/agreement-acceptance endpoints.
- Commission engine: specificity selection, percentage/fixed/min/max/splits, snapshots, no retroactive drift; settlements/adjustments/payouts.
- Billing: plans/plan_versions/entitlements/subscription_events; change-plan opens new subscription (history intact). Advertising MVP: serve/click/dedup/spend/budget-guard + rollups.
- Search: SearchEngine port; PgFtsEngine (tsvector+GIN, facets, bbox, bounded pagination) VERIFIED + OpenSearchEngine adapter (gated, UNVERIFIED live); RebuildSearchIndex command; index lag stats.
- apps/worker created: 9 workers (outbox bridge, search indexer, notifications, email, sms, media(sharp pipeline: EXIF-strip/WebP/variants/pHash/dedupe/quarantine), fraud, analytics, cleanup) with retry/backoff/idempotency/DLQ/observability.
- Verification: typecheck 0 / lint 0 / build 0 (4 pkgs). Tests 60/60 (12 suites incl. integration+E2E+red-team). Concurrency 5/5 (transition, job-claim, budget, refresh-reuse, impression-dedup). SQL suites 37/37 + 22/22 on karen_g4_fresh. Schema diff REMOVED 0 / ADDED 189. Benchmarks p95 1.0/1.2/1.7ms (targets 300/500/400; sandbox caveat). Red-team 15 scenarios: 12 blocked+regression, 2 N/A, 1 partial.
- Found+fixed real concurrency bug: bigint version returned as string broke optimistic concurrency (mapListing Number()).
- Governance: 17 GATE4_*.md reports + evidence (12 files) + schema snapshot (SHA 40bd5ee4…) + FILE_MANIFEST (72+ entries) + PROJECT_STATE_SUMMARY + RECOVERY.md + archive karen-home-gate4-final.tar.gz (SHA de9cfe9a…). Commits 4fdb484(+manifest) tag gate4-final.

Stage Summary:
- Gate 4 = PARTIAL (proceed-capable; zero critical security/data-integrity issues). Frontend remains forbidden until next user mandate. Gaps registered honestly (OpenSearch/SMTP/Twilio/FCM live vendors, ClamAV/S3, messaging service, CRM depth).
---
Task ID: ARTIFACT-EXPORT
Agent: Main Agent (Artifact Export Orchestrator)
Task: PROJECT ARTIFACT EXPORT — Current State Snapshot per user mandate (mandatory export governance rule now in force; no new features, no next gate)

Work Log:
- Real filesystem enumeration (no guessing): git ls-files = 819 tracked files; download/ = 70 files (not 57 — UI panel count differs from FS truth; discrepancy documented in FILE_COUNTS.txt).
- Include set = 756 files: download/ 70 (Gate 4 + W0/Gate3 reports, evidence, snapshots, manifests, archive), w0-work/ 319 (backend monorepo incl. 138 committed dist/ files), w0-rebuild/artifacts 360 + bundle 2 + downloads.zip + page_or_zip.bin (reference inputs), worklog.md + .gitignore + .env (root).
- Exclude set = 63 tracked files, all registered in EXPORT_EXCLUSIONS.md with reasons: micromamba tooling 58 (bin/lib/info), agent tool cache tool-results/ 5. Also excluded (untracked/ignored): node_modules, skills/, .git/, upload/ (empty).
- Secret scan over all included files: docker-compose.postgres.yml POSTGRES_PASSWORD local dev default → REDACTED in exported copy (original not exported); .env root = no credential (reviewed, kept); .env.example = placeholders (kept by design); test passwords = fixtures. All registered in SENSITIVE_DATA_REDACTIONS.md.
- Export structure: download/project-artifact-export/ with 00_manifest/ (11 governance docs), workspace/ (exact original-path mirror of all 756 files), 99_original_paths/ (path index). Per-file manifest: 16 audit fields (ID, paths, size, SHA-256, category, module, gate, version=last-commit, mtime, purpose, authority status, included, notes) in MD + CSV.
- Generated: PROJECT_ARTIFACT_EXPORT_MANIFEST.md/.csv, SHA256SUMS, EXPORT_EXCLUSIONS.md, SENSITIVE_DATA_REDACTIONS.md, FILE_COUNTS.txt, GIT_STATE.txt, CATEGORY_INDEX.md, CURRENT_PROJECT_STATE.md, RECOVERY_FROM_EXPORT.md.
- Bundle: Karen_Home_Project_Artifacts_CURRENT_v1.zip (self-contained; re-extracted + SHA-verified + count-verified post-build). Git governance rule adopted: every future file-producing task ends with an Artifact Bundle (Karen_Home_Artifacts_<Gate>_R<n>.zip naming).

Stage Summary:
- Current state frozen at commit dc2eb5c (tag gate4-final). Gate 4 = PARTIAL unchanged. NO next gate started — per explicit user instruction this task ends after bundle delivery.
