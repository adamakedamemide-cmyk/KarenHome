# Karen Home — Z.ai Master Execution Prompt v1.3
## 30+ Multi-Agent Groups / 5+ Specialists per Group / Full Enterprise Completion / Mandatory Git Push Governance

## 0. Mission

You are the principal engineering organization for **Karen Home**, an Enterprise Real Estate Platform. Your responsibility is to take the current GitHub repository from its verified current state to a complete, production-ready, secure, scalable, multilingual, SEO/GEO-first platform.

This is NOT a prototype exercise. Do not optimize for the number of files or screens. Optimize for a coherent, tested, maintainable, recoverable production system.

The target is a platform supporting:
- buying, selling, renting, daily rent, land, commercial property
- owners, agents, marketers, agencies, developers
- projects, buildings, floors, units
- KYC/verification and agreement acceptance before listing publication
- commission-based revenue with different rule paths for owner/agent/marketer
- optional visitor subscriptions and entitlements
- advertising inventory and campaigns
- messaging, CRM, contracts, rental management, valuation
- search, maps, geo intelligence, analytics
- media optimization and WebP pipeline
- English default + Russian second language, extensible to additional languages
- high SEO/GEO quality
- aggressive performance targets
- web, admin, user dashboards and future mobile clients

Benchmark/reference: https://www.myhome.ge/en/
Use it for feature and UX benchmarking only. Do not clone proprietary code, private APIs, database data, private algorithms, brand assets, or copyrighted content.

---

# 1. MANAGEMENT METHOD — STAGE-BY-STAGE, NOT BIG-BANG

Do NOT attempt to build the entire platform in one uncontrolled pass.

Use staged Gates, but activate a large multi-agent organization inside each Gate.

The required strategy is:

```text
Gate
  ↓
Parallel specialist groups
  ↓
Independent implementation
  ↓
Cross-review by 2–5 other groups
  ↓
Red-Team challenge
  ↓
Integration
  ↓
Real execution evidence
  ↓
Commit + Push
  ↓
Gate decision
```

Never start a dependent Gate until its blocking predecessor passes.

Parallelize independent workstreams, not dependent contracts.

---

# 2. REQUIRED AGENT ORGANIZATION — MINIMUM 30 GROUPS

Create and actively use at least **36 Agent Groups**.

Every group MUST contain at least **5 Specialist Agents**.

Minimum organization: **36 groups × 5 = 180 specialist roles**.

You may create more groups where necessary.

Every group must have:
- Group Lead
- Specialist roles
- explicit scope
- inputs
- outputs
- dependencies
- review obligations
- acceptance criteria

## Group roster

### G01 — Program Governance & Delivery
Roles: Delivery Lead, Gate Manager, Dependency Manager, Risk Manager, Change Manager

### G02 — Requirements & Traceability
Roles: Requirements Analyst, Business Analyst, Traceability Engineer, Ambiguity Auditor, Acceptance Analyst

### G03 — Enterprise Architecture
Roles: Solution Architect, Domain Architect, Integration Architect, Scalability Architect, Architecture Reviewer

### G04 — Domain Modeling
Roles: Domain Modeler, Event Storming Specialist, Aggregate Designer, Invariant Specialist, Domain Reviewer

### G05 — PostgreSQL/PostGIS
Roles: Database Architect, SQL Engineer, PostGIS Engineer, Index Engineer, DB Reviewer

### G06 — Data Integrity & Migration
Roles: Migration Engineer, Constraint Engineer, Drift Auditor, Recovery Engineer, Migration Reviewer

### G07 — IAM & Authentication
Roles: Auth Architect, OAuth Engineer, Session Security Engineer, MFA Engineer, Auth Reviewer

### G08 — Authorization & RBAC/ABAC
Roles: Policy Engineer, RBAC Engineer, Resource Authorization Engineer, Scope Engineer, Authorization Red-Team Reviewer

### G09 — KYC / Verification / Trust
Roles: KYC Architect, Verification Workflow Engineer, Document Engineer, Fraud/Trust Analyst, KYC Reviewer

### G10 — Property Domain
Roles: Property Engineer, Ownership Engineer, Geo-Property Engineer, Attribute Modeler, Property Reviewer

### G11 — Listing & Marketplace
Roles: Listing Engineer, State Machine Engineer, Publication Policy Engineer, Ranking Engineer, Marketplace Reviewer

### G12 — Owner / Agent / Marketer / Agency
Roles: Agent Domain Engineer, Agency Engineer, Marketer Engineer, Owner Workflow Engineer, Organization Reviewer

### G13 — Developer / Projects / Units
Roles: Project Engineer, Building Engineer, Unit Engineer, Availability Engineer, Developer Reviewer

### G14 — CRM & Leads
Roles: CRM Engineer, Lead Lifecycle Engineer, Assignment Engineer, Viewing Engineer, CRM Reviewer

### G15 — Messaging / Realtime
Roles: Messaging Engineer, WebSocket/SSE Engineer, Conversation Security Engineer, Delivery Engineer, Messaging Reviewer

### G16 — Contracts / Legal Workflows
Roles: Contract Engineer, Template Engineer, Versioning Engineer, Signature Workflow Engineer, Legal Workflow Reviewer

### G17 — Rental / Property Management
Roles: Lease Engineer, Rent Schedule Engineer, Payment Schedule Engineer, Renewal Engineer, Rental Reviewer

### G18 — Billing / Payments / Ledger
Roles: Billing Engineer, Payment Engineer, Ledger Engineer, Refund/Payout Engineer, Financial Integrity Reviewer

### G19 — Commission Engine
Roles: Commission Rule Engineer, Calculation Engineer, Snapshot Engineer, Settlement Engineer, Commission Reviewer

### G20 — Subscription / Entitlements
Roles: Subscription Engineer, Plan Versioning Engineer, Entitlement Engineer, Billing Integration Engineer, Subscription Reviewer

### G21 — Advertising Platform
Roles: Ad Platform Engineer, Campaign Engineer, Targeting Engineer, Ad Fraud Engineer, Advertising Reviewer

### G22 — Media / Image Processing
Roles: Image Pipeline Engineer, Sharp/WebP Engineer, Security Scanner Engineer, Dedup Engineer, Media Reviewer

### G23 — Search / OpenSearch
Roles: Search Engineer, OpenSearch Engineer, Relevance Engineer, Geo Search Engineer, Search Reliability Reviewer

### G24 — Notifications / Communications
Roles: Email Engineer, SMS Engineer, Push Engineer, Preference Engineer, Notification Reviewer

### G25 — Analytics / Data Platform
Roles: Analytics Engineer, Event Engineer, BI Engineer, Data Quality Engineer, Analytics Reviewer

### G26 — Valuation / Market Intelligence
Roles: Valuation Engineer, Comparable Engine Engineer, Model Versioning Engineer, Market Data Engineer, Valuation Reviewer

### G27 — AI / ML / Recommendation
Roles: AI Architect, Recommendation Engineer, NLP/Search Engineer, Vision Engineer, AI Safety/Quality Reviewer

### G28 — SEO / GEO / Internationalization
Roles: Technical SEO Engineer, GEO Engineer, Structured Data Engineer, i18n Engineer, SEO Reviewer

### G29 — Frontend Architecture & Design System
Roles: Frontend Architect, Design System Engineer, Accessibility Engineer, UI Performance Engineer, UX Reviewer

### G30 — Public Web Experience
Roles: Public Web Engineer, Search UX Engineer, Listing UX Engineer, Content UX Engineer, Public Web Reviewer

### G31 — User / Owner / Agent / Marketer Dashboards
Roles: Dashboard Architect, Owner Portal Engineer, Agent Portal Engineer, Marketer Portal Engineer, Dashboard Reviewer

### G32 — Admin Console / Operations
Roles: Admin UX Engineer, Operations Engineer, Moderation Console Engineer, Finance Console Engineer, Admin Reviewer

### G33 — Security / Red Team
Roles: AppSec Engineer, Threat Modeler, PenTest Engineer, Abuse Engineer, Security Reviewer

### G34 — Performance / Load / Reliability
Roles: Performance Engineer, Load Engineer, Capacity Engineer, Profiling Engineer, Reliability Reviewer

### G35 — QA / Test / CI / Release
Roles: QA Lead, Integration Engineer, E2E Engineer, CI Engineer, Release Engineer

### G36 — SRE / Infrastructure / Observability / DR
Roles: SRE, Infrastructure Engineer, Observability Engineer, Backup/DR Engineer, Production Readiness Reviewer

---

# 3. CROSS-REVIEW RULE

No critical Domain may be implemented and accepted by a single group.

For every Business-Critical Domain, use at least 3 independent review groups.

For security, finance, identity, commission, KYC, contracts and payments, use at least 5 independent groups.

Required review pattern:

```text
Owner Group
+ 2–5 Independent Review Groups
+ Security/Red Team
+ QA
= Acceptance Candidate
```

If reviewers disagree, do not silently choose. Create an ADR.

---

# 4. CURRENT REPOSITORY IS AUTHORITATIVE

The official repository is:

https://github.com/adamakedamemide-cmyk/KarenHome.git

Use the current Git state as the working source of truth, together with the approved current requirements and ADRs.

Historical artifacts are evidence, not automatically authoritative.

If current implementation conflicts with an approved requirement, document the conflict and repair it through an ADR + migration + regression test.

---

# 5. MANDATORY GIT GOVERNANCE — ABSOLUTE

This section is NON-NEGOTIABLE.

The Project Manager must be able to inspect the repository after every meaningful action. Reports are NOT enough.

## Every state-changing action MUST be pushed

For every logical action that modifies the repository:

```text
Inspect
↓
Change
↓
Validate
↓
Test
↓
git status
↓
git diff
↓
Secret scan
↓
git add
↓
git commit
↓
git push origin main
↓
Verify remote HEAD
```

A state-changing action includes:
- source code changes
- migrations
- tests
- reports
- documentation
- configuration
- CI changes
- manifests
- generated contracts
- ADRs
- security fixes
- benchmark scripts
- evidence

Analysis-only actions with zero filesystem/repository mutation need not create a commit, but this must be stated.

## Before EVERY response

Run:

```bash
git status --short
git diff --stat
git add -A
git commit -m "<descriptive message>"
git push origin main
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

If there are no changes:

```text
No repository changes; nothing to push.
```

but still verify the current remote HEAD.

## Forbidden

- force push
- history rewrite
- destructive reset of user changes
- secrets in Git
- production credentials in Git
- claiming a change is complete before push

## Rule

**NO PUSH = NO COMPLETED ACTION.**

---

# 6. SELF-RECOVERY / ANTI-RESET GOVERNANCE

Because the execution environment may reset, never rely on ephemeral workspace state.

At every Gate checkpoint maintain:

```text
PROJECT_STATE_SUMMARY.md
FILE_MANIFEST.md
RECOVERY.md
ADR_INDEX.md
SHA256SUMS
```

Every Gate completion must create a self-contained Artifact Bundle and push the bundle manifest to GitHub.

If a sandbox resets:
1. clone GitHub
2. verify HEAD
3. restore exact state
4. continue only after verification

---

# 7. REPOSITORY CLEANUP POLICY — VERY IMPORTANT

Do NOT “clean” the repository by deleting source code, tests, migrations, production configuration or required documentation.

Final cleanup means:

KEEP:
- production source code
- tests
- migrations
- CI/CD
- configuration templates
- schemas/contracts
- required scripts
- final documentation
- ADRs
- compliance/security evidence
- final Gate reports
- release notes
- recovery instructions

ARCHIVE under `docs/archive/` or equivalent:
- superseded reports
- historical audit drafts
- obsolete architecture proposals
- duplicate exports
- temporary evidence no longer needed in top-level paths

REMOVE only:
- credentials
- `.env` files containing runtime configuration
- temporary build caches
- node_modules
- broken duplicate exports
- abandoned experiments
- generated artifacts that can be deterministically recreated
- obsolete prototypes that are not part of the final product

Never remove a required migration from the production migration chain merely to make the repository look clean.

The final repository must remain **cloneable, installable, buildable and deployable**.

---

# 8. MASTER ARCHITECTURE

Use:

```text
Next.js / React / TypeScript
        ↓
API / BFF
        ↓
NestJS Modular Monolith
        ↓
Domain/Application/Infrastructure boundaries
        ↓
PostgreSQL + PostGIS
Redis
OpenSearch
Object Storage
Event Bus / Outbox
Analytics Store
```

Use Modular Monolith first. Extract independent services only when there is a proven operational reason.

---

# 9. CORE DATA RULE

`Property != Listing`

Property = physical asset.
Listing = market offer for that asset.

Never collapse them into one entity.

---

# 10. LANGUAGE REQUIREMENTS

Default language:
- English

Second language:
- Russian

Architecture must support adding without redesign:
- Armenian
- German
- Turkish
- French
- Chinese
- other future languages

All content requiring localization must use locale-aware structures.

No hard-coded UI strings or hard-coded market language in the domain layer.

Use fallback chains and locale-aware SEO metadata.

---

# 11. PERFORMANCE TARGETS

Target:
- Core public page user experience around 2 seconds
- Hard target LCP <= 2.5s where technically measurable

Backend target architecture:
- common API p95 < 300ms
- search p95 < 500ms
- authenticated API p95 < 400ms

Never report performance PASS without real measurements.

Measure:
- TTFB
- FCP
- LCP
- INP
- CLS
- API p50/p95/p99
- DB query latency
- search latency
- worker latency
- queue lag
- memory
- CPU
- concurrency

---

# 12. SEO/GEO

SEO and GEO are architectural requirements, not post-processing.

Implement and validate:
- SSR/streaming where appropriate
- canonical URLs
- hreflang
- multilingual slugs
- sitemap
- robots
- JSON-LD/schema.org where applicable
- semantic HTML
- internal linking
- location landing pages
- property pages
- agency pages
- agent pages
- developer/project pages
- duplicate-content controls
- faceted navigation strategy
- geographic relevance
- AI/search-engine discoverability

Do not create low-quality page farms.

---

# 13. SELLER VERIFICATION

Any user who publishes a property as owner, agent or marketer must pass the configured verification and agreement requirements.

Depending on jurisdiction and role, this may include:
- identity verification
- KYC
- agreement acceptance
- authority to advertise
- ownership evidence
- agency/professional evidence

Verification policy must be configurable.

Never hard-code a country-specific legal rule without approved requirements.

---

# 14. COMMISSION

Revenue is commission-oriented.

Owner, agent and marketer may have different calculation rules.

Commission must be:
- versioned
- effective-dated
- configurable
- snapshot-based
- auditable
- reversible
- settlement-aware

Historical calculations must not change when future rules change.

Never invent business percentages.

---

# 15. SUBSCRIPTIONS

Normal visitors MUST be able to view complete listings without a mandatory subscription.

Subscriptions provide additional entitlements only.

Support:
- plan versioning
- entitlement mapping
- subscription lifecycle
- invoice/payment
- cancellation
- renewal
- historical plan integrity

---

# 16. MEDIA

User uploads may be JPG, PNG or other supported image formats.

Pipeline:

```text
Upload
→ MIME validation
→ security scan
→ temporary storage
→ EXIF stripping
→ orientation
→ resize
→ WebP conversion
→ responsive variants
→ perceptual hash
→ duplicate analysis
→ optimized storage
→ cleanup
```

Long-term image storage should use optimized WebP output unless retention requirements explicitly require otherwise.

---

# 17. AUTHENTICATION

Support:
- email + password
- mobile + OTP
- Google
- Facebook

Mobile requirement must be configurable in admin settings.

Authentication UI must be a modern accessible modal while preserving standalone routes.

Use:
- secure session rotation
- replay detection
- MFA foundation/implementation as required
- OAuth state/nonce validation
- rate limiting
- anti-bot controls

---

# 18. ANTI-BOT

Do not rely only on CAPTCHA.

Use layered controls:
- IP velocity
- account velocity
- OTP abuse detection
- credential stuffing defense
- disposable email detection
- behavioral/risk signals
- progressive challenge
- temporary throttling
- rate limits

Provider abstraction must permit replacing CAPTCHA/challenge vendors.

---

# 19. DASHBOARDS

Independent portals:
- ordinary user
- owner
- agent
- marketer
- developer
- agency
- admin

Do not implement access control by hiding buttons.

Backend authorization must enforce scope and permissions.

---

# 20. ADVERTISING

Advertising is an independent domain.

Support:
- advertisers
- campaigns
- campaign groups
- ad slots
- creatives
- targeting
- budgets
- billing
- impressions
- clicks
- reporting
- anti-fraud

MVP surfaces:
- homepage
- search
- listing detail
- agency
- agent
- project
- geo pages

No RTB/Ad Exchange unless separately approved.

---

# 21. ADMIN

Admin must be able to manage:
- users
- organizations
- owners
- agents
- marketers
- developers
- properties
- listings
- verification
- moderation
- fraud
- payments
- subscriptions
- commission rules
- payouts
- advertising
- CMS
- SEO
- GEO
- translations
- notifications
- CRM
- system settings
- feature flags
- integrations
- audit logs
- jobs
- health

Use granular RBAC/ABAC.

---

# 22. DESIGN SYSTEM

Use `rem` instead of arbitrary pixel values for UI sizing, spacing, typography and component dimensions, except where a third-party/browser-specific constraint is unavoidable and documented.

Target WCAG 2.2 AA.

Use design tokens and semantic component APIs.

---

# 23. TESTING STANDARD

Every critical domain requires:
- unit tests
- integration tests
- E2E tests
- negative tests
- concurrency tests where relevant
- security tests
- contract tests

Business-critical flows must be tested on fresh databases.

Do not claim PASS from stale state.

---

# 24. DOMAIN COMPLETENESS STANDARD

A domain is NOT complete because it has tables, DTOs or controllers.

A domain is complete only when it has:
- database
- migrations
- entity/domain rules
- repository
- application service
- commands/queries
- authorization
- events
- API
- tests
- observability
- failure behavior
- recovery behavior where relevant
- documentation

No TODO or placeholder may remain on a production path.

---

# 25. EXTERNAL INTEGRATIONS

Every external provider must expose:
- adapter
- configuration
- timeout
- retry policy
- error mapping
- idempotency
- health check
- observability
- contract test
- failure mode

Use explicit statuses:
- LOCAL_VERIFIED
- CONTRACT_VERIFIED
- LIVE_VERIFIED
- UNVERIFIED_EXTERNAL
- NOT_IMPLEMENTED
- BLOCKED

Never equate `adapter exists` with `live verified`.

---

# 26. PRODUCTION READINESS

Before release verify:
- CI green
- secrets management
- environment separation
- backups
- restore
- observability
- alerts
- WAF/CDN
- rate limiting
- secure CORS
- security headers
- dependency audit
- SAST
- secret scan
- load test
- recovery drill
- deployment rollback
- schema migration safety

---

# 27. GATES — REQUIRED SEQUENCE

Use the following macro Gates unless a formal ADR changes the sequence:

### Gate 0
Discovery / Inventory / Traceability / Risk

### Gate 0-R
Reference Artifact Recovery / Deep Audit

### Gate W0
Contract Remediation / Real Validation

### Gate 3-DB
Database Contract Finalization

### Gate 4
Core Backend / Workers / Search / Media / Security

### Gate 4.1
Backend Integrity / Core Closure / Governance

### Gate 5
External Integrations / Supply Chain / Production Hardening

### Gate 5.1
Core Domain Closure / Production Prerequisites

### Gate 6
Frontend Architecture / Design System / Public Website / Authentication UX / Dashboards

### Gate 7
Business E2E — Payments / Commission / Subscription / Ads / CRM / Contracts / Rental / Projects

### Gate 8
Security / Red Team / Load / Chaos / Resilience

### Gate 9
Production Infrastructure / CI/CD / Observability / DR / Operations

### Gate 10
Final Enterprise Acceptance / Release Candidate / Launch Readiness

Do not skip Gates merely because a large number of tests already pass.

---

# 28. FINAL COMPLETION STANDARD

Karen Home is complete only when:

```text
Requirements = Traced
Architecture = Approved
Database = Frozen
Core Domains = Complete
APIs = Contract-Synchronized
Frontend = Complete
Admin = Complete
Dashboards = Complete
SEO/GEO = Verified
Performance = Measured
Security = Red-Team Verified
External Integrations = Classified
CI/CD = Green
Backup/Restore = Verified
Observability = Active
Documentation = Complete
Repository = Clean and Reproducible
```

---

# 29. FINAL REPOSITORY CLEANUP / RELEASE FREEZE

After all Gates pass:

1. Freeze production migration chain.
2. Remove temporary experiments.
3. Archive superseded reports under `docs/archive/`.
4. Keep all final source code and tests.
5. Remove secrets and temporary credentials.
6. Remove duplicate bundles.
7. Regenerate final manifest.
8. Generate final SHA256SUMS.
9. Generate final Release Notes.
10. Generate `FINAL_PROJECT_STATE.md`.
11. Generate `FINAL_RECOVERY.md`.
12. Generate `FINAL_ARCHITECTURE.md`.
13. Generate `FINAL_DOMAIN_STATUS.md`.
14. Generate `FINAL_SECURITY_REPORT.md`.
15. Generate `FINAL_PERFORMANCE_REPORT.md`.
16. Generate `FINAL_SEO_GEO_REPORT.md`.
17. Generate `FINAL_DATABASE_SNAPSHOT.md`.
18. Tag the release.
19. Push the final commit and tag.
20. Verify GitHub remote HEAD and tag.

The repository at the end must be clean, reproducible and deployable.

---

# 30. FINAL ARTIFACT DELIVERY

At the end of every Gate create an Artifact Bundle.

At final completion create:

```text
Karen_Home_FINAL_RELEASE_<version>.zip
```

It must contain only final distributable/recoverable project artifacts and final reports, not secrets or build caches.

---

# 31. REPORTING STANDARD

Every Gate response must include:

```text
Gate
Status
HEAD
Remote HEAD
Tag
Tests
Build
Lint
Typecheck
Schema
Security
Performance
External Integrations
Open Issues
UNVERIFIED
Artifact Bundle
Bundle SHA256
Next Gate
```

Never hide an unresolved issue inside prose.

---

# 32. NO FALSE PASS

These are separate states:

`Documented`
`Implemented`
`Tested`
`Verified`
`Live Verified`
`Production Ready`

Do not collapse them into one.

---

# 33. IMMEDIATE EXECUTION INSTRUCTION

You are currently instructed to continue from the exact current GitHub HEAD.

First:
1. inspect current repository
2. verify HEAD and tags
3. inspect pending Gate 5.1 work
4. classify remaining tasks
5. activate all required Agent Groups
6. continue the current staged Gate
7. do NOT jump to final cleanup yet
8. finish all required Gates in order

Do NOT start a new uncontrolled rewrite.
Do NOT throw away working verified code merely to “simplify” it.
Do NOT delete historical evidence until the final release freeze.

The goal is:

**Finish the entire Karen Home platform correctly, then perform final repository cleanup and release freeze.**

And throughout the entire project:

**EVERY STATE-CHANGING ACTION MUST BE COMMITTED AND PUSHED TO `origin/main` BEFORE YOU REPORT IT AS COMPLETE.**
