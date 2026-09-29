# KAREN HOME — ENTERPRISE REAL ESTATE PLATFORM
## MASTER EXECUTION PROMPT FOR Z.AI MULTI-AGENT ENGINE
### Version 1.1 — Zero-to-Production, File-by-File, Evidence-Driven, No-Guessing

> **HANDOVER REQUIREMENT:** Attach this Master Prompt together with `Karen_Home_Reference_Artifacts_v1.zip` and/or the individual reference archives/files listed in Section 0A. Z.ai MUST read and audit all supplied artifacts before implementation.

---

## 0. EXECUTION DIRECTIVE

You are the principal AI engineering organization responsible for designing and implementing **Karen Home**, an enterprise-grade real-estate marketplace and transaction platform from zero to production.

This document is not a suggestion list. Treat it as a **binding project execution specification**.

You must not improvise requirements that materially affect architecture, security, data integrity, business rules, money flows, legal workflows, or user permissions. When a requirement is genuinely missing, first classify the gap, identify safe configurable alternatives, and record the unresolved point in a formal decision log. Do not silently choose a business-critical behavior.

Your objective is not to create a visually convincing prototype. Your objective is to produce a **production-capable, secure, scalable, testable, observable, maintainable, internationally extensible, SEO/GEO-optimized real-estate platform** with a clean domain model and strong architectural boundaries.

The platform must be developed under these principles:

1. No guessing on critical requirements.
2. No fabricated test results.
3. No claiming “production-ready” without evidence.
4. No placeholder business logic hidden behind apparently complete UI.
5. No fake success responses from APIs.
6. No uncontrolled technical debt in the core domain.
7. No direct coupling to a single vendor where an adapter boundary is appropriate.
8. No data loss during migrations.
9. No PII or secrets in logs.
10. No security controls that exist only in documentation but are bypassable in code.
11. No irreversible architecture decisions without an ADR.
12. Every material feature must be traceable to a requirement and to tests.
13. Every generated file must have an explicit purpose and owner domain.
14. Every major workstream must be reviewed by multiple independent agent groups.
15. Every gate must have objective acceptance criteria.

---

# 0A. MANDATORY REFERENCE ARTIFACTS — READ, AUDIT, TRACE, DO NOT BLINDLY TRUST

Before any architecture decision, implementation, code generation, migration, UI construction, API design, or infrastructure work, you MUST read and audit the **Reference Artifacts** that accompany this Master Prompt.

The reference artifacts are part of the project handover. They are not optional background material.

## 0A.1 Files to be attached to Z.ai

I will provide the following artifacts together with this Master Prompt. If both the individual files and the consolidated archive are provided, treat them as the same evidence set and deduplicate your reading internally:

### A. Database / Architecture history

- `enterprise_real_estate_schema_v1.sql`
- `enterprise_real_estate_schema_v1_review.md`
- `enterprise_real_estate_contract_v1/enterprise_real_estate_schema_frozen_v1.sql`
- `enterprise_real_estate_contract_v1/docs/DATABASE_CONTRACT_FREEZE.md`
- `enterprise_real_estate_contract_v1/erd/schema_full.md`
- `enterprise_real_estate_contract_v1.zip`

### B. Backend contract

- `enterprise_real_estate_backend_contract_v1.zip`
- Within that archive, read at minimum:
  - `contracts/database-schema-frozen-v1.sql`
  - `contracts/database-contract-freeze-v1.md`
  - `contracts/typescript-contracts.ts`
  - `openapi/openapi-v1.yaml`
  - `architecture/backend-folder-structure.txt`
  - `docs/01-domain-boundaries.md`
  - `docs/02-api-conventions.md`
  - `docs/03-authorization-matrix.md`
  - `docs/04-error-model.md`
  - `docs/05-command-query-catalog.md`
  - `docs/06-event-catalog.md`
  - `docs/07-implementation-order.md`
  - `docs/CHANGE_CONTROL.md`
  - `tests/backend-contract-checklist.md`

### C. Initial backend skeleton

- `enterprise_real_estate_backend_skeleton_v1.zip`
- Read its complete source tree, not only its README.

### D. Gate 1 implementation

- `work_backend/enterprise_real_estate_backend_gate1.zip`
- Read its complete source tree and implementation notes.

### E. Gate 2 hardened backend

- `enterprise_real_estate_backend_gate2.zip`
- Read its complete source tree and, in particular, all of:
  - `docs/DEEP_AUDIT_GATE1_FILE_BY_FILE.md`
  - `docs/GATE2_CORE_DOMAIN.md`
  - `docs/SCHEMA_ERRATA_1_1.md`
  - `docs/API_CONTRACT_DELTA_GATE2.md`
  - `docs/GATE2_MANIFEST.md`
  - `docs/STATIC_REVIEW_CHECKS.md`
  - `docs/IMPLEMENTATION_GATE_1.md`
  - `docs/IMPLEMENTATION_GATE_2.md`
  - `database/base/enterprise_real_estate_schema_frozen_v1.sql`
  - every file under `database/errata/`
  - every SQL verification file under `database/verify/`
  - every backend source file under `apps/`, `packages/`, and their tests

### F. Consolidated reference bundle

A consolidated handover archive is also provided:

`Karen_Home_Reference_Artifacts_v1.zip`

If this archive is present, read its `REFERENCE_ARTIFACTS_MANIFEST.md` first and then inspect **every source/documentation/configuration file inside it**. The archive is only a transport convenience; the contained files remain individually auditable.

## 0A.2 Mandatory reference-audit procedure

Treat the artifacts as a previous engineering workstream that must be independently audited before reuse.

Create:

`docs/REFERENCE_ARTIFACT_AUDIT.md`

and a machine-readable inventory:

`docs/reference-artifacts-manifest.json`

For EVERY artifact/file, record at minimum:

- artifact path
- file name
- file type
- source archive
- domain
- purpose
- current state
- dependency relationships
- referenced tables/modules/APIs
- whether it is normative, historical, illustrative, or obsolete
- whether it has been independently verified
- known limitations
- conflicts with other artifacts
- disposition: KEEP / MODIFY / REPLACE / DEPRECATE / UNKNOWN
- reason

## 0A.3 Authority and conflict-resolution rules

The previous artifacts are **reference evidence**, not unconditional authority.

The authority order is:

1. Current explicit Karen Home business/product/security requirements in this Master Prompt.
2. Explicit decisions recorded in the current project ADR/Decision Log.
3. Validated database/API contracts that have passed current gates.
4. Prior architecture/schema/backend artifacts supplied as reference evidence.
5. Existing implementation behavior.
6. Assumptions.

Never treat an assumption as a requirement.

If two artifacts disagree:

1. Identify the exact conflict.
2. Quote the relevant file paths/sections in the internal audit report.
3. Determine whether the conflict is semantic, structural, security-related, data-related, or merely naming/version drift.
4. Assess migration/backward-compatibility impact.
5. Resolve according to the authority order above.
6. Record the decision in an ADR.
7. Update the affected contract(s).
8. Add or update a regression test.
9. Preserve the old artifact for audit history; do not silently overwrite evidence.

## 0A.4 Do not blindly reuse previous code

The existence of previously generated code does NOT make it correct.

The previous code must be treated as an engineering baseline candidate, and each file must be checked for:

- correctness
- security
- authorization
- transactionality
- concurrency
- type safety
- data consistency
- observability
- test coverage
- API compatibility
- performance
- maintainability
- architectural boundary violations
- placeholder/fake behavior
- hard-coded business rules
- secret leakage
- logging of PII
- unsafe SQL
- unsafe file handling
- migration safety

Reimplement or replace a file whenever the audit determines that modification is safer than preserving it.

## 0A.5 Mandatory file-by-file reading before implementation

Before writing production code, Z.ai must be able to answer:

- What is the purpose of each supplied artifact?
- Which tables, modules, endpoints, or domains does it define?
- Which files depend on it?
- Which artifacts supersede it?
- What changed between the initial schema, frozen schema, backend contract, Gate 1, and Gate 2?
- Which prior implementation claims are verified and which remain unverified?
- Which parts must be retained for historical compatibility?
- Which parts should be discarded?

The first implementation response after artifact upload must therefore be a **Gate 0 reference-artifact audit**, not blind code generation.

# 1. PRODUCT IDENTITY

## 1.1 Product name

The product name is:

**Karen Home**

Do not rename it.

Use the name consistently across:

- product metadata
- application title
- browser title templates
- email templates
- UI branding
- legal templates
- OpenGraph metadata
- PWA metadata
- mobile package metadata
- admin console
- documentation
- environment configuration
- analytics events
- structured data where appropriate

Do not copy the brand, source code, private data, images, texts, or proprietary implementation of third-party sites.

---

# 2. REFERENCE BENCHMARK

The following public site is a benchmark/reference for feature discovery and market behavior:

https://www.myhome.ge/en/

Study it for:

- information architecture
- search/filter behavior
- listing concepts
- agent/agency concepts
- project/developer concepts
- pricing concepts
- property pages
- marketplace flows
- market analytics patterns
- mortgage concepts
- promotion/VIP concepts
- contracts and supporting services
- navigation patterns
- SEO landing-page patterns

However:

**Do NOT clone proprietary code, private APIs, private algorithms, private data, copyrighted assets, branding, proprietary texts, private database structures, or hidden implementation details.**

Use the reference only as a product benchmark. Karen Home must have its own:

- code
- design system
- architecture
- data model
- content
- visual identity
- workflows
- ranking logic
- legal copy

Where reference behavior is useful, implement a functionally equivalent or better independent design.

---

# 3. PRIMARY BUSINESS MODEL

Karen Home is a real-estate platform supporting at minimum:

- property sale
- property rent
- long-term lease
- daily/short-term rental where enabled
- land sales
- commercial real estate
- new developments/projects
- owner listings
- real-estate agent listings
- marketer/referral listings
- developer projects
- property management capabilities for future expansion
- contracts
- transaction commissions
- subscriptions
- promoted listings
- advertising inventory
- service marketplace expansion

The platform must be architected so that additional property types, countries, business models and services can be introduced without rewriting the core.

---

# 4. LANGUAGE AND LOCALIZATION REQUIREMENTS

## 4.1 Default language

The default language is:

**English (`en`)**

## 4.2 Second language

The second supported language is:

**Russian (`ru`)**

## 4.3 Future languages

The architecture must allow addition of languages without restructuring the application:

- Armenian (`hy`)
- German (`de`)
- Turkish (`tr`)
- French (`fr`)
- Chinese (`zh`)
- and other future locales

Do not hard-code language logic into UI components.

Do not use conditional chains such as:

```ts
if (lang === 'en') ...
else if (lang === 'ru') ...
```

for scalable content rendering.

Use a real localization architecture.

## 4.4 Localization rules

Support:

- translated UI strings
- translated CMS content
- localized SEO metadata
- localized URL strategy
- localized slugs where appropriate
- locale-aware number formatting
- locale-aware date formatting
- locale-aware currency presentation
- locale-aware pluralization
- locale-aware sorting
- right-to-left readiness even if RTL is not enabled at launch
- translation completeness checks
- fallback language behavior
- translation versioning where needed
- hreflang generation
- canonical rules per locale

The default language must never silently disappear because another language is incomplete.

Every translation key must have a defined fallback strategy.

Translation files must be typed/validated where the stack allows it.

---

# 5. AGENT ORGANIZATION MANDATE

You must orchestrate **at least 20 agent groups**, and each group must contain **at least 5 specialist agents**.

Target baseline:

**20 groups × 5 agents = minimum 100 specialist agents/roles.**

If the Z.ai runtime cannot execute all agents concurrently, execute the groups in controlled waves while preserving persistent state, decisions, artifacts and review history.

Do NOT reduce the required coverage merely because concurrency is limited.

Each major workstream must be reviewed by at least **2 and preferably 3–5 agent groups**.

Every group must have:

- a clearly defined charter
- five or more specialist roles
- input artifacts
- output artifacts
- acceptance criteria
- cross-review responsibilities
- escalation path

No agent group may be the sole authority over a security-critical, money-critical, legal-critical or data-integrity-critical area.

---

# 6. REQUIRED AGENT GROUPS

## G01 — Architecture & Program Governance

Minimum agents:

1. Principal Architect
2. Systems Architect
3. Requirements Engineer
4. ADR/Decision Auditor
5. Technical Program Coordinator

Responsibilities:

- overall architecture
- boundaries
- dependency governance
- architectural decisions
- roadmap
- gate management
- change control
- requirements traceability
- technical debt governance

Outputs:

- architecture map
- system context diagram
- container/component diagrams
- ADR repository
- dependency graph
- gate criteria
- change log

---

## G02 — Product & Domain Modeling

Minimum agents:

1. Product Systems Analyst
2. Marketplace Domain Analyst
3. Monetization Analyst
4. CRM/Workflow Analyst
5. Acceptance-Criteria Engineer

Responsibilities:

- product requirements
- domain terminology
- user journeys
- state machines
- business rules
- commission semantics
- subscription semantics
- property/listing/project concepts

Outputs:

- PRD
- domain glossary
- requirements matrix
- acceptance criteria
- business-rule catalog

---

## G03 — UX/UI & Information Architecture

Minimum agents:

1. UX Architect
2. Interaction Designer
3. Information Architect
4. UX Writer
5. Conversion/Usability Specialist

Responsibilities:

- information architecture
- navigation
- search UX
- listing UX
- dashboards
- forms
- modal authentication
- responsive behavior
- conversion flows

Outputs:

- user flows
- wireframes/specifications
- interaction states
- empty/error/loading states
- usability checklist

---

## G04 — Design System, Accessibility & Visual Quality

Minimum agents:

1. Design-System Architect
2. Visual Designer
3. Accessibility Specialist
4. Responsive UI Specialist
5. Motion/Interaction Performance Specialist

Responsibilities:

- tokens
- typography
- spacing
- components
- accessibility
- responsive behavior
- visual consistency
- rem-only sizing policy
- reduced-motion behavior

The site must target WCAG 2.2 AA or better.

All CSS design dimensions must use `rem` or other scalable units. Do not use `px` for ordinary design sizing, typography, spacing, radii, component dimensions or breakpoints. If a third-party or browser-specific value unavoidably requires pixels, isolate it, document it, and keep it out of the design-system API.

Preferred units:

- rem
- em
- %
- vw/vh/dvh/svh/lvh where appropriate
- fr
- ch
- clamp()
- unitless line-height
- zero without a unit

---

## G05 — Frontend Architecture

Minimum agents:

1. Next.js Architect
2. React Engineer
3. State/Data Engineer
4. Forms/Validation Engineer
5. SSR/SEO Frontend Engineer

Responsibilities:

- Next.js application architecture
- server rendering
- streaming
- caching
- route design
- forms
- data fetching
- client boundaries
- code splitting
- performance
- accessibility

Preferred technology baseline:

- Next.js
- React
- TypeScript
- strict typing
- server components where appropriate
- client components only where required
- schema validation
- typed API client

---

## G06 — Backend & Domain Services

Minimum agents:

1. NestJS Architect
2. Domain Engineer
3. API Engineer
4. Integration Engineer
5. Background-Worker Engineer

Responsibilities:

- backend modules
- domain services
- application services
- repositories
- commands/queries
- REST APIs
- WebSocket
- workers
- events
- transactional boundaries

Preferred baseline:

- Node.js
- TypeScript
- NestJS
- Fastify adapter where appropriate
- REST/OpenAPI
- WebSocket where justified

---

## G07 — PostgreSQL, PostGIS & Data Integrity

Minimum agents:

1. PostgreSQL Architect
2. PostGIS/Geo Database Engineer
3. Data Integrity Engineer
4. Migration Engineer
5. Query/Index Performance Engineer

Responsibilities:

- schema
- migrations
- constraints
- indexes
- transactions
- locks
- query plans
- spatial queries
- auditability
- database performance

Preferred baseline:

- PostgreSQL
- PostGIS
- normalized transactional schema
- JSONB only where appropriate
- explicit constraints
- strong FK integrity
- database-enforced invariants

---

## G08 — Search, Map & Geo Intelligence

Minimum agents:

1. Search Relevance Engineer
2. OpenSearch Engineer
3. Geo/Spatial Engineer
4. Map UX Engineer
5. Location Data Engineer

Responsibilities:

- search
- faceting
- geo search
- polygon search
- ranking
- map clusters
- address normalization
- location hierarchy
- location landing pages

Preferred baseline:

- OpenSearch
- PostGIS
- map provider behind an adapter

---

## G09 — Media Pipeline & Content Processing

Minimum agents:

1. Image Processing Engineer
2. Object Storage Engineer
3. CDN/Media Delivery Engineer
4. Media Moderation Engineer
5. Video/360/Floorplan Specialist

Responsibilities:

- image ingestion
- validation
- optimization
- WebP conversion
- responsive derivatives
- EXIF stripping
- malware/quarantine workflow
- duplicate detection
- storage
- CDN

### Mandatory image policy

Any uploaded image may be JPEG, PNG, GIF where supported, HEIC/HEIF or another permitted format.

The system must:

1. receive upload into a temporary/quarantine area
2. validate type using file signatures, not only file extension
3. scan for malicious content where technically applicable
4. strip unsafe metadata/EXIF
5. normalize orientation
6. resize according to source dimensions and product policy
7. convert all retained image derivatives to WebP
8. generate required responsive WebP variants
9. preserve visual quality using controlled quality settings
10. calculate checksum/perceptual hash
11. store only approved WebP derivatives as long-term media
12. remove the temporary original after successful processing unless a documented legal/operational retention rule explicitly requires otherwise

Human-readable public filenames must be derived from the listing name, for example:

`modern-2-bedroom-apartment-01.webp`
`modern-2-bedroom-apartment-02.webp`

Use an internal immutable object path/identifier for collision safety, but do not expose raw database IDs as the visible filename.

The image pipeline must never become a synchronous bottleneck for listing creation.

---

## G10 — Identity, Security, KYC & Anti-Bot

Minimum agents:

1. IAM Security Engineer
2. Application Security Engineer
3. KYC/Identity Specialist
4. Anti-Bot/Risk Engineer
5. Privacy/Data-Protection Engineer

Responsibilities:

- registration
- login
- mobile/email verification
- OAuth
- MFA readiness
- sessions
- refresh-token rotation
- RBAC
- organization permissions
- KYC
- identity verification
- seller eligibility
- anti-bot
- rate limiting
- fraud signals
- privacy

Authentication providers must include:

- email + password
- mobile/OTP where enabled
- Google OAuth
- Facebook OAuth

Mobile phone requirement must be configurable in admin settings:

- required
- optional
- disabled for selected registration modes only if legally and technically acceptable

Do not weaken security when mobile verification is optional.

### Seller identity requirement

A visitor/user must NOT be able to create a live property listing merely by creating an account.

Before a user can submit an owner/agent/marketer listing for publication, the platform must verify required prerequisites.

At minimum this includes:

- account verification as configured
- identity/KYC verification appropriate to role and jurisdiction
- acceptance of required platform agreements
- acceptance of seller/agent/marketer contract documents and current versions
- role-specific supporting documents where required
- ownership evidence or authority-to-list evidence where required
- agency/license documentation for agents where applicable
- marketer/referral agreement where applicable

The exact legal evidence must remain jurisdiction-configurable.

The system must distinguish:

- account verified
- identity verified
- agreement accepted
- seller eligibility verified
- property/authority verified

Do not collapse all of these into one boolean.

### Dedicated anti-bot system

Do not rely solely on a public CAPTCHA widget.

Build a layered anti-bot/risk architecture including, where appropriate:

- IP reputation
- request rate limits
- device/session signals
- browser behavior signals
- velocity checks
- suspicious registration patterns
- form timing anomalies
- disposable email detection
- OTP abuse controls
- credential-stuffing protection
- progressive challenge escalation
- temporary throttling
- proof-of-work or challenge mechanisms where appropriate
- provider challenge fallback if needed

Avoid invasive fingerprinting that is unnecessary or unlawful.

Every risk decision must be explainable internally as a set of signals.

---

## G11 — Payments, Commission, Subscription & Financial Ledger

Minimum agents:

1. Payment Engineer
2. Commission Engine Engineer
3. Double-Entry Ledger Engineer
4. Subscription/Billing Engineer
5. Reconciliation/Payout Engineer

Responsibilities:

- payment intents
- payments
- refunds
- invoices
- ledger
- commissions
- subscriptions
- payouts
- reconciliation

### Core revenue model

Karen Home earns revenue from commissions associated with completed sale/rental contracts, according to configurable business rules.

Commission calculations differ by participant type:

- owner
- real-estate agent
- marketer/referral partner

Do NOT hard-code unprovided commission percentages.

Create a versioned, effective-dated commission rules engine supporting dimensions such as:

- participant role
- transaction type
- property type
- price band
- organization
- campaign/referral source
- geography
- date range
- contract state
- fixed fee
- percentage fee
- minimum fee
- maximum fee
- split rules
- platform share
- participant share
- tax/fee adjustments where jurisdictionally relevant

Every calculated commission must be reproducible later from:

- rule version
- inputs
- calculation timestamp
- transaction/contract reference
- output breakdown

### No subscription paywall for listings

Users do NOT need a subscription to view full property listings.

Subscription plans are supplemental value layers, not mandatory access to core listing content.

Subscription features may include configurable combinations of:

- advanced saved searches
- higher alert limits
- advanced comparison
- market analytics
- investor tools
- priority support
- ad-free experience where appropriate
- additional notifications
- enhanced dashboard tools
- additional CRM or workflow features for professional tiers

Plan names, prices and entitlements must be admin-configurable.

---

## G12 — Owner, Agent & Marketer Portals / CRM

Minimum agents:

1. Owner Portal Engineer
2. Agent Portal Engineer
3. Marketer/Referral Portal Engineer
4. CRM Engineer
5. Lead/Appointment Workflow Engineer

The platform must contain separate dashboards for:

### Owner

- identity/KYC status
- agreements
- properties
- listings
- drafts
- views
- leads
- inquiries
- viewings
- contracts
- commission obligations
- payments/payouts where applicable
- notifications
- performance
- profile

### Real-estate agent

- verification
- agency membership
- properties/listings
- leads
- pipeline
- clients
- appointments
- team visibility where permitted
- commission reports
- payout status
- messaging
- documents
- listing performance

### Marketer / referral partner

- verification
- referral agreement
- referral links/codes where enabled
- leads
- referred listings
- attributed transactions
- commission status
- payout history
- campaign analytics

### Ordinary visitor/user

- profile
- favorites
- saved searches
- alerts
- comparison
- viewing requests
- messages
- subscriptions
- privacy settings
- language/currency preferences

The dashboards must be separate experiences with role-specific permissions; do not simply render the same dashboard with hidden buttons.

---

## G13 — Admin, Moderation & Advertising Platform

Minimum agents:

1. Admin Console Architect
2. Moderation Specialist
3. Advertising Platform Engineer
4. RBAC/Admin Security Specialist
5. Reporting/Operations Specialist

### Admin panel must provide granular control over:

- dashboard/overview
- users
- roles
- permissions
- organizations
- owners
- agents
- marketers
- developers
- properties
- listings
- projects
- locations
- verification/KYC
- contracts
- payments
- commission rules
- subscriptions
- promotions
- advertisements
- ad placements
- campaigns
- content/CMS
- SEO
- translations
- support tickets
- reports
- moderation
- anti-bot/risk
- audit logs
- feature flags
- integrations
- system settings
- email/SMS templates
- notification templates
- maintenance mode
- queues/background jobs
- system health indicators

### Advertising system

Create a first-class ad platform.

Support configurable inventory such as:

- homepage hero placements
- homepage cards
- search result placements
- listing detail placements
- sidebar placements
- category placements
- project placements
- location landing pages
- dashboard placements
- mobile placements
- native/sponsored cards

Each placement must have:

- identifier
- dimensions/format policy
- targeting rules
- start/end date
- budget
- impression limits
- click limits if applicable
- frequency capping
- priority
- campaign
- creative
- advertiser
- approval status
- measurement

The ad system must not significantly degrade Core Web Vitals.

Ad loading must be lazy/asynchronous where appropriate.

Never block critical rendering on non-critical advertising assets.

---

## G14 — SEO, International SEO, GEO & Generative Engine Optimization

Minimum agents:

1. Technical SEO Engineer
2. International SEO Engineer
3. Local/Geographic SEO Specialist
4. Structured Data Specialist
5. GEO/AI-Discovery Specialist

SEO must be treated as architecture, not post-launch decoration.

### Technical SEO requirements

Implement and validate:

- server-rendered/indexable content
- canonical URLs
- hreflang
- XML sitemap index
- per-locale sitemaps
- image sitemap where useful
- dynamic lastmod
- robots.txt
- OpenGraph
- social metadata
- breadcrumb structured data where applicable
- valid schema.org structured data
- semantic HTML
- crawlable links
- indexation controls
- faceted navigation controls
- duplicate-content protection
- soft-404 avoidance
- pagination strategy
- redirect management
- 404/410 strategy
- location landing pages
- entity pages
- internal linking
- text alternatives for images

### Real-estate SEO

Support scalable pages for combinations such as:

- apartments for sale in a city
- houses for rent in a district
- land for sale in an area
- commercial property in a location
- projects/developers
- neighborhood pages
- agent/agency pages

Do not create infinite low-quality faceted pages merely to increase index count.

Create explicit indexation rules based on search demand, content quality, uniqueness and crawl value.

### GEO requirements

Interpret GEO as both:

1. geographic/local discoverability
2. generative-engine discoverability

For geographic discovery:

- hierarchical locations
- stable location entities
- coordinates
- localized location pages
- consistent location naming
- map indexing strategy
- local business/agency entity consistency

For generative-engine discoverability:

- clear entity definitions
- structured facts
- authoritative first-party content
- consistent organization/property metadata
- concise factual summaries
- FAQ where useful
- valid structured data
- source/reference transparency
- no spammy AI-generated content farms

Do not make speculative claims about search-engine ranking guarantees.

---

## G15 — Performance, Scalability & Capacity Engineering

Minimum agents:

1. Web Performance Engineer
2. Backend Performance Engineer
3. Load/Stress Test Engineer
4. Cache/CDN Engineer
5. Capacity Planning Engineer

### Hard performance objective

Target core public pages to load in approximately **2.0 seconds**, with a hard acceptance ceiling of **2.5 seconds p75 LCP** under a clearly documented representative test environment.

Do not claim this target without measurement.

Track at minimum:

- TTFB
- FCP
- LCP
- CLS
- INP
- server latency
- API latency
- search latency
- image load time
- JS size
- CSS size
- cache hit rate
- DB query latency
- error rate

Target quality metrics should include, where practical:

- LCP ≤ 2.5s p75
- CLS ≤ 0.1
- INP ≤ 200ms target
- fast TTFB for CDN-cached public content

Exact thresholds must be measured and documented per environment.

### Performance architecture

Use where appropriate:

- SSR
- streaming
- CDN
- edge caching
- ISR/revalidation
- server components
- route-level code splitting
- selective hydration
- lazy loading
- compressed assets
- optimized fonts
- WebP images
- preconnect only when useful
- resource hints only where measured
- query optimization
- connection pooling
- Redis caching
- OpenSearch for heavy search workload

Do not blindly add caching without invalidation strategy.

---

## G16 — QA, Test Automation & Red-Team Validation

Minimum agents:

1. QA Architect
2. Unit/Integration Test Engineer
3. E2E Automation Engineer
4. Security Test Engineer
5. Chaos/Failure Testing Engineer

Testing must include:

- unit tests
- integration tests
- repository tests
- API contract tests
- authorization tests
- negative tests
- E2E tests
- performance tests
- accessibility tests
- visual regression tests where practical
- security tests
- migration tests
- rollback tests
- queue retry tests
- webhook idempotency tests
- concurrency tests
- race-condition tests
- disaster recovery tests

No gate passes based only on happy-path tests.

Every money flow, identity flow, state transition, permission check and destructive operation needs negative tests.

---

## G17 — DevOps, CI/CD, Observability & SRE

Minimum agents:

1. CI/CD Engineer
2. Container/Infrastructure Engineer
3. Observability Engineer
4. Backup/Disaster-Recovery Engineer
5. Release/SRE Engineer

Requirements:

- reproducible builds
- environment separation
- secrets management
- migrations
- health checks
- readiness/liveness
- logging
- metrics
- tracing
- error tracking
- backup
- restore testing
- deployment rollback
- release notes
- SBOM
- dependency scanning
- vulnerability scanning

Target infrastructure should support:

- development
- staging
- production

Do not use production secrets in source control.

---

## G18 — Analytics, Recommendation, AI & Fraud Intelligence

Minimum agents:

1. Analytics Engineer
2. Recommendation Engineer
3. AI Search Engineer
4. Fraud/Risk Data Scientist
5. Experimentation Specialist

Future-ready capabilities:

- natural language property search
- recommendations
- similar properties
- price intelligence
- valuation models
- image classification
- listing text assistance
- anomaly detection
- fraud signals
- investor analytics

AI systems must not silently make irreversible financial/legal decisions.

Human-review workflows must exist for high-impact decisions.

---

## G19 — Localization, Legal Workflows & Compliance

Minimum agents:

1. Localization Architect
2. Translation QA Specialist
3. Legal Workflow Analyst
4. Privacy/Data Governance Specialist
5. Compliance Configuration Specialist

Requirements:

- jurisdiction-aware policy engine
- configurable agreements
- contract templates
- versioned legal documents
- acceptance records
- effective dates
- audit trail
- retention policies
- privacy controls
- data export/delete workflows where legally required
- translation review process

Do not hard-code one country's legal assumptions into universal business logic.

---

## G20 — Independent Red Team, Code Audit & Release Certification

Minimum agents:

1. Independent Architecture Auditor
2. Security Red-Team Auditor
3. Data Integrity Auditor
4. Performance/SEO Auditor
5. Release Certification Auditor

This group must NOT simply approve the work produced by the group that implemented it.

It must actively attempt to break it.

Required activities:

- adversarial requirements review
- code smell review
- privilege escalation attempts
- race conditions
- transaction failures
- invalid state transitions
- data corruption tests
- search-index drift analysis
- SEO crawl/indexation review
- performance regressions
- accessibility failures
- deployment rollback test

---

# 7. AGENT REVIEW TOPOLOGY

For every major workstream use multiple groups.

Minimum review matrix:

| Workstream | Primary Groups | Mandatory Review Groups |
|---|---|---|
| Requirements | G01,G02 | G20,G03 |
| UX/UI | G03,G04 | G05,G16,G20 |
| Auth/KYC | G10,G06 | G07,G16,G20 |
| Database | G07 | G06,G10,G11,G16,G20 |
| Property/Listing | G02,G06,G07 | G08,G16,G20 |
| Search/Map | G08,G06 | G07,G14,G15,G16 |
| Media | G09 | G05,G15,G16 |
| Payments/Commission | G11,G06,G07 | G10,G16,G20 |
| Subscriptions | G11,G06 | G02,G07,G16 |
| Portals/CRM | G12,G03,G05,G06 | G10,G16,G20 |
| Admin | G13,G03,G05,G06 | G10,G16,G20 |
| Ads | G13,G06,G15 | G14,G16,G20 |
| SEO/GEO | G14,G05,G08 | G15,G16,G20 |
| Performance | G15 | G05,G06,G07,G16,G20 |
| AI | G18,G06 | G10,G14,G16,G20 |
| DevOps | G17 | G06,G10,G15,G16,G20 |
| Localization | G19,G03,G05 | G14,G16,G20 |

If the implementation of a feature requires more review groups, use more. Never use fewer than the required minimum.

---

# 8. SOURCE-OF-TRUTH HIERARCHY

When sources conflict, follow this order:

1. Explicit user requirements in this master prompt.
2. Explicit project decisions approved during execution.
3. Approved ADRs.
4. Frozen database/API contracts.
5. Validated product requirements.
6. Implementation details.
7. External benchmark/reference behavior.

The public benchmark site is never above explicit project requirements.

When a conflict is discovered:

- stop the affected workstream
- log the conflict
- identify impacted artifacts
- request or create an ADR only if a real decision is required
- do not silently reconcile by guessing

---

# 9. REQUIRED ARTIFACTS BEFORE IMPLEMENTATION

Before meaningful code generation begins, create and maintain:

```text
/docs/
  PRODUCT_REQUIREMENTS.md
  DOMAIN_GLOSSARY.md
  REQUIREMENTS_TRACEABILITY.md
  SYSTEM_ARCHITECTURE.md
  SECURITY_ARCHITECTURE.md
  DATA_ARCHITECTURE.md
  SEARCH_ARCHITECTURE.md
  MEDIA_ARCHITECTURE.md
  PERFORMANCE_BUDGET.md
  SEO_GEO_ARCHITECTURE.md
  I18N_ARCHITECTURE.md
  MONETIZATION_SPEC.md
  KYC_SPEC.md
  ADMIN_SPEC.md
  CRM_SPEC.md
  ADS_SPEC.md
  TEST_STRATEGY.md
  DISASTER_RECOVERY.md
  OBSERVABILITY.md
  OPERATIONS_RUNBOOK.md

/adr/
  ADR-0001-...
  ADR-0002-...

/contracts/
  openapi.yaml
  events.yaml
  error-model.yaml
  permissions.yaml

/database/
  migrations/
  seeds/
  verification/
  erd/

/qa/
  test-matrix.md
  e2e/
  security/
  performance/

/project/
  FILE_MANIFEST.md
  IMPLEMENTATION_STATUS.md
  CHANGELOG.md
  DECISIONS.md
```

All files must be updated as the project evolves.

---

# 10. FILE-BY-FILE GOVERNANCE

This is mandatory.

Create a file manifest with one record per source/config/test/documentation file.

Each record must contain:

- path
- type
- responsible agent group
- purpose
- dependencies
- inputs
- outputs
- public interfaces
- security sensitivity
- test coverage
- status
- last-reviewed-by
- last-reviewed-date

No untracked source file is allowed in the final build.

No placeholder file is allowed to masquerade as completed functionality.

At every gate, perform a file-by-file review.

---

# 11. ARCHITECTURE BASELINE

Use a modular, domain-oriented architecture.

Do NOT start with dozens of independent microservices.

Use a **Modular Monolith + Event-Driven Architecture** initially, with clear boundaries for future service extraction.

Recommended high-level stack:

### Frontend

- Next.js
- React
- TypeScript
- strict mode
- accessible component system
- typed API client

### Backend

- Node.js
- TypeScript
- NestJS
- Fastify adapter where useful
- REST/OpenAPI
- WebSocket for real-time features where appropriate

### Primary database

- PostgreSQL
- PostGIS

### Search

- OpenSearch

### Cache

- Redis

### Object storage

- S3-compatible storage

### Events/queue

- RabbitMQ/NATS initially, with abstraction for future Kafka/Redpanda if scale requires it

### Analytics

- ClickHouse or another fit-for-purpose analytical store when required

### Observability

- OpenTelemetry
- metrics
- logs
- traces
- Sentry or equivalent

### Edge/security

- Cloudflare or equivalent CDN/WAF layer

Do not blindly follow the stack if a validated architectural reason requires change. Any material stack change requires an ADR and cross-review by at least G01, G06, G07, G15 and G20.

---

# 12. CORE DOMAIN MODEL

At minimum, separate these concepts:

```text
User
Organization
Role
Permission
AgentProfile
MarketerProfile
Property
PropertyLocation
PropertyOwnership
PropertyAmenity
PropertyMedia
PropertyDocument
Listing
ListingPriceHistory
ListingStatusHistory
Favorite
SavedSearch
Project
ProjectBuilding
ProjectFloor
ProjectUnit
Lead
LeadActivity
Viewing
Conversation
Message
Product
Order
Payment
Refund
Invoice
LedgerAccount
LedgerTransaction
LedgerEntry
Subscription
CommissionRule
CommissionCalculation
Payout
VerificationCase
VerificationDocument
ModerationCase
Report
AdPlacement
Campaign
Creative
Contract
ContractVersion
ContractParty
ContractSignature
Lease
RentSchedule
RentPayment
Valuation
Notification
Review
AuditLog
OutboxEvent
SeoPage
CmsPage
Translation
SystemSetting
FeatureFlag
```

## Critical separation

**Property ≠ Listing**

A Property represents the physical asset.

A Listing represents a market offer for that asset.

One property can have multiple listings across time or transaction types.

Never collapse these concepts.

---

# 13. DATABASE RULES

The database is the source of truth for transactional data.

Enforce business-critical invariants in the database where practical.

Minimum expectations:

- proper FK constraints
- unique constraints
- partial unique indexes
- check constraints
- appropriate composite indexes
- PostGIS spatial indexes
- transactional outbox
- audit history
- optimistic concurrency where needed
- locking for race-prone workflows
- exclusion constraints for interval overlap where appropriate
- monetary precision
- currency validation
- status transition validation
- ownership integrity

Do not use floating-point types for monetary amounts.

Use decimal/numeric or integer minor units consistently by architectural decision.

The choice must be documented and consistent.

---

# 14. MONEY AND CURRENCY MODEL

Never store money as formatted strings.

Bad:

```text
"$250,000"
```

Good conceptual model:

```text
amount
currency
```

or an approved minor-unit representation.

Support multiple currencies from day one:

- USD
- EUR
- GBP
- RUB
- AMD
- TRY
- AZN
- GEL
- CNY
- future currencies

Do not hard-code one home currency into financial domain logic.

Exchange rates, when needed, must have a timestamp and source.

---

# 15. PROPERTY MODEL

Support extensible property types including:

- apartment
- house
- villa
- townhouse
- country house
- land
- commercial
- office
- retail
- warehouse
- hotel
- industrial
- parking
- storage
- development project unit

For land, allow future expansion for:

- agricultural/non-agricultural classification
- zoning
- cadastral identifier
- polygon geometry
- road frontage
- access
- utilities
- development restrictions
- ownership data

Use a structured attribute model rather than uncontrolled free text for core searchable facts.

---

# 16. LISTING MODEL

Listings must support:

- sale
- rent
- lease
- daily rent
- other configured transaction modes

Lifecycle should be explicit and auditable.

Example:

```text
DRAFT
PENDING_VERIFICATION
PENDING_MODERATION
PUBLISHED
PAUSED
RESERVED
UNDER_CONTRACT
SOLD
RENTED
EXPIRED
ARCHIVED
REJECTED
```

Do not allow arbitrary transitions.

Use a state machine and test all allowed and forbidden transitions.

---

# 17. SELLER ELIGIBILITY GATE

A listing creator must pass through eligibility checks.

Minimum conceptual flow:

```text
Create Account
    ↓
Verify Account
    ↓
Complete Required KYC
    ↓
Accept Current Seller/Agent/Marketer Agreements
    ↓
Provide Required Role/Property Documents
    ↓
Eligibility Approved
    ↓
Create Draft Listing
    ↓
Moderation
    ↓
Publish
```

The platform must prevent API-level bypasses.

Never rely only on frontend button hiding.

The backend must independently enforce eligibility.

---

# 18. PROPERTY AUTHORITY VERIFICATION

For owner listings, verify ownership or authority according to jurisdiction and available evidence.

For agents:

- verify identity
- verify professional/agency documents where applicable
- verify association with agency where applicable
- verify authority to represent listings

For marketers:

- verify identity
- verify referral/marketing agreement
- verify attribution rules

The workflow must be configurable and auditable.

---

# 19. COMMISSION ENGINE

Create a dedicated commission engine.

Conceptual flow:

```text
Contract reaches eligible financial milestone
        ↓
Determine applicable rule version
        ↓
Collect transaction inputs
        ↓
Calculate gross commission
        ↓
Split among eligible parties
        ↓
Create immutable calculation snapshot
        ↓
Create financial obligations
        ↓
Collect/settle
        ↓
Reconcile
        ↓
Payout/report
```

Commission calculation must be deterministic and reproducible.

Never overwrite historical rules.

Use effective-dated versioning.

---

# 20. SUBSCRIPTIONS

Core listing visibility remains free.

Implement a flexible entitlement system.

Conceptual model:

```text
Plan
  ↓
Price
  ↓
Billing Period
  ↓
Entitlements
  ↓
Subscription
  ↓
Usage/Limit
```

Examples of entitlements:

- saved-search count
- alert count
- analytics access
- comparison count
- contact tools
- support priority
- ad-free mode
- professional analytics

Do not hard-code plan names in business logic.

---

# 21. AUTH UX

The login and registration experience must be a modern accessible modal/dialog.

Support:

- email/password
- mobile/OTP if enabled
- Google
- Facebook
- password recovery
- verification
- agreement acknowledgment
- progressive KYC steps when relevant

Requirements:

- keyboard accessible
- focus trapping
- escape handling
- screen reader labeling
- error states
- network error handling
- loading states
- anti-bot challenge integration
- deep-link preservation
- return-to-intended-action flow
- responsive mobile design

A direct `/login` and `/register` route must also exist as an accessible fallback even if the primary UX is modal.

---

# 22. ADMIN SETTINGS

The admin panel must expose configuration, not hard-coded constants, for at least:

- mobile required/optional state
- registration policies
- verification policies
- listing expiration
- moderation rules
- commission rules
- subscription plans
- ad placements
- promotion products
- search behavior settings
- ranking weights where safe
- notification policies
- supported locales
- default locale
- supported currencies
- image limits
- media quality configuration
- allowed file types
- feature flags
- maintenance mode
- legal document versions
- contract templates
- email templates
- SMS templates
- anti-bot thresholds
- rate limits
- operational thresholds

All sensitive settings require appropriate authorization and audit logging.

---

# 23. ADMIN RBAC

Use fine-grained permissions.

Examples:

```text
users.read
users.write
users.suspend

listings.read
listings.moderate
listings.publish
listings.archive

kyc.read
kyc.review
kyc.approve

commission.read
commission.write
commission.approve

payments.read
payments.refund
payments.reconcile

ads.read
ads.write
ads.approve

seo.read
seo.write

settings.read
settings.write

system.audit.read
```

Never give one giant `admin=true` permission for all sensitive functions.

---

# 24. SEARCH ARCHITECTURE

Search should be a dedicated read model.

PostgreSQL is the source of truth.

OpenSearch is a derived index.

Pipeline:

```text
Transactional change
   ↓
Outbox event
   ↓
Indexer
   ↓
OpenSearch
```

Index at least:

- property type
- transaction type
- location hierarchy
- geometry
- price
- area
- rooms
- bedrooms
- bathrooms
- amenities
- verification status
- listing status
- organization type
- project
- promotion state
- language content
- relevant text fields

Search must support:

- full text
- filters
- facets
- sort
- geo distance
- polygon search
- map viewport search
- synonyms
- typo tolerance where appropriate
- language-aware analysis
- relevance ranking

Do not let sponsored ranking destroy search quality.

Promotion influence must be bounded, transparent internally and testable.

---

# 25. MAP AND GEO

Support:

- map display
- marker clustering
- viewport search
- radius search
- polygon/drawn-area search
- nearby amenities
- geocoding adapter
- reverse geocoding adapter
- hierarchical locations

Protect exact owner addresses where privacy requires it.

Do not expose precise coordinates of a property automatically if the business/security policy does not allow it.

---

# 26. MEDIA / WEBP POLICY

All long-term stored listing photos must be WebP.

Responsive variants should also be WebP.

The rendering layer should choose the appropriate derivative based on display size.

Use:

- CDN
- long-lived immutable caching for versioned assets
- lazy loading except carefully selected above-the-fold media
- width/height metadata
- aspect-ratio to avoid layout shift
- blur/placeholder only where useful

Never make the browser download a huge original if a smaller optimized derivative is sufficient.

---

# 27. ADVERTISING PERFORMANCE RULES

Ads must be isolated from core application state.

They must not block:

- main content
- authentication
- search interaction
- critical JS
- page interactivity

Use asynchronous loading and measurable viewability.

Ad creatives must be moderated.

Prevent malicious ad scripts from receiving inappropriate application privileges.

---

# 28. SECURITY BASELINE

Implement at least:

- Argon2id password hashing
- short-lived access tokens
- rotating refresh tokens
- refresh-token reuse detection
- secure cookie strategy where applicable
- CSRF protection where applicable
- strict CORS
- rate limiting
- account lockout/escalation policy
- credential stuffing protection
- security headers
- CSP where compatible
- secure file handling
- SSRF protection
- SQL injection prevention
- XSS protection
- output encoding
- webhook signature verification
- idempotency keys for payment operations
- audit logging
- PII classification
- secret management
- dependency scanning

Never log:

- passwords
- OTP values
- refresh tokens
- full payment secrets
- identity document contents
- raw authorization headers

---

# 29. PRIVACY AND DATA GOVERNANCE

Classify data:

- public
- internal
- confidential
- sensitive
- highly sensitive

Provide appropriate access control and retention.

Support where legally required:

- data export
- deletion/anonymization
- consent/terms records
- communication preferences
- audit trail

KYC documents should have strict access boundaries and retention policies.

---

# 30. CONTRACTS AND LEGAL DOCUMENTS

Legal/contract workflows must be versioned.

A contract acceptance record must identify:

- document type
- version
- language
- effective date
- user/organization
- timestamp
- context
- IP/device evidence where legally appropriate

Do not overwrite accepted legal versions.

---

# 31. PROPERTY CONTRACT WORKFLOW

For sale/rental transaction support, design for:

```text
Draft Contract
 ↓
Review
 ↓
Ready for Signature
 ↓
Party Signatures
 ↓
Active/Executed
 ↓
Settlement/Payment
 ↓
Completed/Expired/Terminated
```

The exact legal states should be jurisdiction-configurable.

---

# 32. CRM WORKFLOW

Lead state should be explicit, for example:

```text
NEW
CONTACTED
QUALIFIED
VIEWING_SCHEDULED
VIEWING_COMPLETED
NEGOTIATION
CONTRACT_PENDING
WON
LOST
CLOSED
```

Track:

- source
- assigned agent
- marketer attribution
- listing
- contact history
- tasks
- notes
- next action
- viewing
- deal value
- commission attribution

---

# 33. NOTIFICATIONS

Central notification service supporting:

- in-app
- email
- SMS
- push
- future WhatsApp/provider integrations

Every notification must pass through:

- preference checks
- rate limits
- template localization
- delivery tracking
- provider abstraction

---

# 34. ANALYTICS

Track product events such as:

- page_viewed
- search_performed
- filter_used
- map_opened
- listing_viewed
- image_opened
- phone_revealed
- contact_clicked
- favorite_added
- saved_search_created
- viewing_requested
- subscription_started
- payment_succeeded
- contract_signed
- listing_created
- listing_published
- listing_sold
- listing_rented

Separate transactional truth from analytical event streams.

Do not use analytics events as the only source of financial truth.

---

# 35. SEO-FRIENDLY URL MODEL

URLs must be human-readable and stable.

Design for localized routes, for example:

```text
/en/
/ru/
/en/properties/for-sale/
/ru/properties/for-sale/
/en/properties/for-rent/apartments/
/en/properties/land/
/en/agents/
/en/agencies/
/en/projects/
/en/locations/{country}/{city}/{district}/
```

Exact taxonomy may change after SEO/domain review.

Avoid exposing internal UUIDs unnecessarily.

Maintain redirect mappings whenever URLs change.

---

# 36. FACETED SEO

Search filters can create millions of URL combinations.

Create a crawl policy:

- index only valuable landing-page combinations
- canonicalize duplicates
- noindex unvaluable combinations
- prevent crawl traps
- manage pagination
- keep useful filtered pages internally linked

Generate programmatic SEO pages only when they contain meaningful unique value.

---

# 37. GEO ENTITY MODEL

Treat these as stable entities:

- country
- region/state
- city
- district
- neighborhood
- street
- landmark
- transit station
- school
- hospital
- agency
- developer

Link properties to normalized geo entities.

Do not store only free-form address strings.

---

# 38. PERFORMANCE BUDGET

Establish budgets before implementation.

At minimum define:

- initial JS
- route JS
- CSS
- image weight
- font weight
- third-party script budget
- API latency
- DB query latency
- search latency
- server render latency

CI should fail or at least block release when defined hard budgets are materially exceeded without an approved exception.

---

# 39. ACCESSIBILITY

Target WCAG 2.2 AA.

Verify:

- keyboard navigation
- visible focus
- modal focus management
- semantic headings
- form labels
- error descriptions
- color contrast
- reduced motion
- screen reader structure
- touch targets
- accessible maps where possible
- alternative route for map-dependent functionality

---

# 40. QUALITY OF UI

The platform must feel modern and premium but not sacrifice performance.

Avoid:

- unnecessary animation
- huge hero videos
- excessive gradients/shadows
- layout shifts
- huge client-side bundles
- decorative JS for simple effects

Every motion effect needs a purpose.

---

# 41. TEST REQUIREMENTS FOR AUTH

Test:

- valid login
- wrong password
- unverified account
- blocked user
- suspended user
- expired access token
- refresh token rotation
- refresh reuse
- concurrent refresh
- OAuth callback failure
- account linking
- OTP abuse
- rate limit
- anti-bot challenge
- missing mobile when required
- wrong provider identity

---

# 42. TEST REQUIREMENTS FOR LISTINGS

Test:

- owner without KYC
- owner without agreement
- agent without verification
- marketer without agreement
- property without ownership/authority evidence when required
- invalid property type
- invalid price
- no media
- no cover
- invalid status transition
- concurrent edit
- stale version
- publish after eligibility revocation
- archive
- sold
- rented

---

# 43. TEST REQUIREMENTS FOR COMMISSION

Test:

- each participant role
- rule version changes
- effective date boundaries
- fixed fee
- percentage fee
- minimum/maximum
- splits
- refunds
- cancellations
- multi-currency
- rounding
- repeated calculation
- calculation reproducibility
- payout reversal

Use integer/decimal arithmetic appropriate to the chosen financial model.

---

# 44. TEST REQUIREMENTS FOR ADS

Test:

- placement activation
- scheduling
- budget
- frequency capping
- targeting
- creative moderation
- approval/rejection
- click/impression accounting
- duplicate impression protection
- campaign expiry
- malicious creative handling
- performance impact

---

# 45. TEST REQUIREMENTS FOR SEO

Automated checks:

- unique title
- description
- canonical
- hreflang
- robots rules
- sitemap inclusion
- structured data validity
- broken internal links
- orphan pages
- duplicate content signals
- incorrect redirects
- localized pages
- 404/410 handling

---

# 46. TEST REQUIREMENTS FOR MEDIA

Test:

- JPEG upload
- PNG upload
- HEIC/HEIF if supported
- corrupted image
- oversized image
- fake extension
- malicious file payload
- rotation metadata
- low-resolution image
- huge dimensions
- conversion failure
- duplicate image
- unsupported MIME
- storage failure
- queue retry

The final persistent media must obey the WebP-only policy.

---

# 47. TEST REQUIREMENTS FOR INTERNATIONALIZATION

Test at minimum:

- English
- Russian

Also test future-language architecture with synthetic locales to make sure adding a locale does not require source-code rewrites.

Check:

- pluralization
- long strings
- missing translation
- fallback
- URL generation
- metadata localization
- date/time
- currency
- sorting

---

# 48. ERROR HANDLING

Create a stable error model.

Every API error should provide machine-readable structure, for example:

```json
{
  "code": "LISTING_NOT_ELIGIBLE",
  "message": "Listing cannot be published until seller verification is complete.",
  "details": {},
  "requestId": "..."
}
```

Do not leak internal stack traces to clients.

Do not turn every error into HTTP 500.

Map domain failures to meaningful HTTP status codes.

---

# 49. OBSERVABILITY

Every request should carry a trace/request identifier.

Track:

- request latency
- database latency
- search latency
- cache hits/misses
- queue depth
- event lag
- failed payments
- failed media jobs
- verification failures
- anti-bot challenge rates
- error rates

Provide dashboards and alerts.

---

# 50. OUTBOX / EVENT PATTERN

Business state changes that require asynchronous side effects should use an outbox pattern.

Example:

```text
BEGIN

update listing
insert outbox event

COMMIT
```

Worker:

```text
claim event
 ↓
process
 ↓
mark published
```

Use safe claiming/locking to reduce duplicate processing.

Events should be idempotently handled.

---

# 51. MIGRATION RULES

Every schema change must be:

- versioned
- reviewed
- deterministic
- forward tested
- rollback/mitigation planned

Never edit an already-applied production migration silently.

Prefer additive migrations first.

For destructive changes:

1. add new structure
2. migrate data
3. verify
4. switch reads/writes
5. remove old structure only in a later controlled migration

---

# 52. DEPENDENCY POLICY

Use a dependency allowlist mindset.

For every dependency:

- purpose
- maintainer/project health
- license
- security status
- bundle/runtime impact
- upgrade policy

Avoid dependency sprawl.

---

# 53. NO MAGIC NUMBERS

Business-critical values must be configurable or explicitly defined in domain constants.

Do not scatter:

- commission rates
- plan prices
- verification durations
- listing expiration
- ad limits
- retry counts
- rate limits
- image limits

through random source files.

---

# 54. NO BUSINESS LOGIC IN UI

The frontend must never be the only place enforcing:

- permissions
- commission rules
- seller eligibility
- listing publication requirements
- payment states
- KYC requirements

Frontend may improve UX.

Backend must enforce business truth.

Database must enforce critical integrity where practical.

---

# 55. NO DIRECT DATABASE ACCESS FROM UI

All client operations must use approved API contracts.

Do not expose PostgreSQL or internal services directly to browsers.

---

# 56. API CONTRACT GOVERNANCE

Use OpenAPI.

API changes must be:

- documented
- versioned
- backward compatibility considered
- represented in generated or validated client types where appropriate

Avoid breaking changes without explicit migration strategy.

---

# 57. PROJECT DIRECTORY BASELINE

Recommended monorepo:

```text
karen-home/
├── apps/
│   ├── web/
│   ├── admin/
│   ├── api/
│   ├── worker/
│   └── realtime/
├── packages/
│   ├── ui/
│   ├── config/
│   ├── contracts/
│   ├── db/
│   ├── validation/
│   ├── sdk/
│   ├── analytics/
│   └── localization/
├── database/
│   ├── migrations/
│   ├── seed/
│   ├── verification/
│   └── erd/
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── kubernetes/
│   └── monitoring/
├── docs/
├── adr/
├── qa/
├── scripts/
└── .github/
```

Adapt only when an ADR explains why.

---

# 58. MODULE STRUCTURE

Backend modules should follow a consistent boundary, for example:

```text
modules/listings/
├── presentation/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── handlers/
│   └── services/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── events/
│   └── repositories/
└── infrastructure/
    ├── persistence/
    ├── search/
    └── mappers/
```

No giant service files.

No giant controller files.

No 3000-line entity classes.

---

# 59. DOMAIN EVENTS

Define stable events for major operations, including:

- UserRegistered
- UserVerified
- OrganizationCreated
- KycSubmitted
- KycApproved
- PropertyCreated
- OwnershipVerified
- ListingCreated
- ListingSubmitted
- ListingPublished
- ListingPriceChanged
- ListingArchived
- FavoriteAdded
- SavedSearchMatched
- LeadCreated
- ViewingScheduled
- ContractCreated
- ContractSigned
- PaymentSucceeded
- CommissionCalculated
- PayoutCompleted
- SubscriptionStarted
- AdApproved
- AdActivated
- VerificationRevoked

Events should be documented and versioned.

---

# 60. AI POLICY

AI is an enhancement layer, not an excuse to weaken deterministic business logic.

AI may help with:

- search interpretation
- recommendations
- content suggestions
- translation assistance
- image tagging
- fraud signals
- analytics

Critical decisions involving:

- money
- legal status
- identity approval
- account bans
- ownership rights

must have deterministic rules and/or human review.

---

# 61. RECOMMENDATION ENGINE

Support future ranking inputs such as:

- explicit preferences
- price range
- location preference
- viewed properties
- favorites
- saved searches
- room preferences
- property type

Avoid using sensitive personal attributes to personalize high-impact decisions.

Recommendations must be explainable enough for product auditing.

---

# 62. VALUATION ENGINE

Future-ready valuation architecture should use:

- comparable listings
- historical transactions where available
- location
- property attributes
- condition
- market trends

Return:

- estimated range
- central estimate
- confidence/coverage indicator
- comparable evidence

Do not present uncertain estimates as guaranteed appraisals.

---

# 63. SERVICE MARKETPLACE EXTENSIBILITY

Architect future service categories for:

- lawyer
- appraiser
- surveyor
- inspector
- architect
- renovation
- movers
- photographers
- 360/virtual-tour provider
- insurance
- mortgage/finance

Use provider abstractions rather than hard-coding one service category.

---

# 64. WHITE-LABEL FUTURE

The architecture should allow future organization-specific branded portals without rewriting the domain.

Separate:

- core business domain
- tenant/organization configuration
- branding/theme
- domains
- feature flags
- content
- locale

Do not build White-label first unless required for MVP; make the architecture ready for it.

---

# 65. MOBILE FUTURE

Web API contracts must support future native or cross-platform mobile applications.

Do not make API responses dependent on browser-only assumptions.

---

# 66. RELEASE GATES

## Gate 0 — Discovery

Deliver:

- requirements inventory
- reference-site audit
- terminology
- open questions
- risk register
- agent plan

No implementation yet.

---

## Gate 1 — Architecture

Deliver:

- system architecture
- domain boundaries
- ADRs
- technology decisions
- deployment model
- security model

Must be reviewed by G01,G06,G07,G10,G15,G20.

---

## Gate 2 — UX/Product

Deliver:

- user journeys
- wireframes/specifications
- design system
- dashboards
- mobile/responsive behavior

Review by G02,G03,G04,G05,G16,G20.

---

## Gate 3 — Database Contract

Deliver:

- full schema
- ERD
- migrations
- constraints
- indexes
- seed
- integrity tests
- performance tests

Must be adversarially reviewed.

---

## Gate 4 — IAM/KYC/Security

Deliver:

- auth
- OAuth
- mobile verification
- session management
- RBAC
- KYC workflow
- anti-bot
- threat model

No listing creation bypass allowed.

---

## Gate 5 — Core Marketplace

Deliver:

- property
- ownership
- listing
- media
- search
- map
- moderation

---

## Gate 6 — Monetization

Deliver:

- commission engine
- payment
- ledger
- subscription
- promotion
- payout/reconciliation

---

## Gate 7 — Portals/Admin

Deliver:

- user dashboard
- owner dashboard
- agent dashboard
- marketer dashboard
- admin
- CRM
- advertising

---

## Gate 8 — SEO/GEO/Performance

Deliver:

- technical SEO
- international SEO
- geo pages
- structured data
- performance evidence
- Core Web Vitals report

---

## Gate 9 — QA/Red Team

Deliver:

- test matrix
- E2E suite
- security report
- performance report
- accessibility report
- migration verification

---

## Gate 10 — Production Readiness

Deliver:

- CI/CD
- observability
- backups
- recovery tests
- deployment documentation
- runbooks
- release checklist
- SBOM
- final audit

---

# 67. DEFINITION OF DONE

A feature is NOT done because:

- UI exists
- API exists
- tests exist only for happy path
- TypeScript compiles

A feature is done only when:

1. Requirements are traceable.
2. Architecture boundary is documented.
3. Database/data model is correct.
4. Backend behavior is implemented.
5. Frontend behavior is implemented.
6. Authorization is enforced.
7. Audit requirements are implemented.
8. Error paths are handled.
9. Tests cover positive and negative cases.
10. Performance is measured where relevant.
11. Accessibility is checked.
12. SEO is checked where public/indexable.
13. Observability exists.
14. Documentation exists.
15. File manifest is updated.
16. Independent review is completed.
17. No known critical defect remains.
18. No placeholder hides missing functionality.

---

# 68. NO-FABRICATION RULE

If a command/test/build cannot be executed, state:

- what was attempted
- why it could not run
- what evidence exists instead
- what remains unverified

Never replace “not tested” with “verified”.

Never report simulated test output as real output.

Never invent deployment success.

Never invent third-party API success.

---

# 69. FILE-BY-FILE AUDIT PROTOCOL

After every substantial implementation wave:

For every file:

1. Read it.
2. Identify its responsibility.
3. Check dependency direction.
4. Check naming.
5. Check security exposure.
6. Check error handling.
7. Check test coverage.
8. Check duplication.
9. Check whether logic belongs there.
10. Compare with contracts.
11. Compare with current ADRs.
12. Record defects.
13. Fix defects.
14. Re-run relevant tests.
15. Update the manifest.

Do not perform shallow review by opening only entrypoint files.

---

# 70. CHANGE MANAGEMENT

When a requirement changes:

1. identify affected requirements
2. identify affected ADRs
3. identify affected database objects
4. identify affected APIs
5. identify affected UI flows
6. identify affected tests
7. identify affected translations
8. identify affected SEO
9. identify affected analytics
10. implement coordinated change
11. re-run impacted gates

---

# 71. PERFORMANCE TEST ENVIRONMENT

Define a reproducible test profile, including:

- browser
- device class
- network profile
- geographic region
- CDN state
- warm/cold cache
- authenticated/anonymous state

Run both:

- lab tests
- production-like field measurements where available

Do not report one Lighthouse run as proof of platform-wide performance.

---

# 72. DATABASE PERFORMANCE

Inspect:

- slow queries
- missing indexes
- unused indexes
- high-cardinality filters
- geo query plans
- search index lag
- N+1 access patterns
- transaction duration
- lock contention

Use `EXPLAIN` / `EXPLAIN ANALYZE` where safe in non-production test environments.

---

# 73. API PERFORMANCE

Establish budgets for:

- auth
- property detail
- listing detail
- search
- map search
- favorites
- saved searches
- dashboard
- admin lists

Avoid loading giant dashboard payloads.

Use pagination and field shaping where appropriate.

---

# 74. SEARCH PERFORMANCE

Measure:

- keyword search latency
- filter latency
- map latency
- facet latency
- indexing lag
- bulk indexing performance

Search must degrade gracefully if OpenSearch is temporarily unavailable.

Public property details may still use transactional data when appropriate.

---

# 75. RESILIENCE

For external dependencies:

- timeout
- retry with backoff
- circuit breaking where justified
- fallback behavior
- idempotency
- dead-letter handling

Do not retry non-idempotent financial operations blindly.

---

# 76. PAYMENT SAFETY

Every payment mutation requires idempotency.

Webhook handlers must:

- authenticate/verify signature
- deduplicate events
- validate amount/currency/order
- handle out-of-order events
- record provider reference
- be safe to replay

Never trust a browser redirect as proof of payment.

---

# 77. COMMISSION AUDITABILITY

For every commission calculation record:

- source contract
- participant
- participant role
- rule version
- calculation inputs
- base amount
- gross commission
- splits
- adjustments
- currency
- timestamps
- resulting obligations

Historical calculations must not change merely because current rules changed.

---

# 78. SUPPORT FOR OWNER/AGENT/MARKETER DIFFERENT ECONOMICS

The engine must support different commission models for:

- owner
- agent
- marketer

without hard-coding the current business policy into UI code.

Use rules and role-based eligibility.

If a future country uses a different commission model, add configuration and/or a policy adapter instead of rewriting the platform.

---

# 79. CUSTOMER SUPPORT

Include:

- tickets
- categories
- priorities
- assignment
- internal notes
- attachments
- status
- SLA configuration
- user communications

Sensitive KYC/payment information must be masked according to role.

---

# 80. ADMIN REPORTING

Admin dashboards should include:

- new users
- verified sellers
- listings created/published
- listings by type
- leads
- viewings
- contracts
- commission revenue
- subscription revenue
- ad revenue
- payouts
- fraud cases
- moderation backlog
- KYC backlog
- search performance
- system health

Do not calculate large analytics directly from transactional tables on every dashboard request.

Use derived aggregates/analytics stores where necessary.

---

# 81. SEARCH RESULT QUALITY

Search should support quality signals such as:

- text relevance
- price fit
- location fit
- freshness
- completeness
- verification
- listing health
- user preference

Sponsored promotion must be bounded and clearly identifiable internally.

Do not manipulate results in ways that make search unusable.

---

# 82. PROPERTY QUALITY SCORE

Optionally maintain an internal quality score based on:

- complete attributes
- media quality
- verified data
- valid location
- responsive seller
- recency

Do not expose a misleading “trust score” to users without a documented methodology.

---

# 83. FRAUD ENGINE

Potential signals:

- repeated phone numbers
- repeated images
- suspiciously copied descriptions
- abnormal price
- location inconsistencies
- account velocity
- repeated failed KYC
- suspicious payment activity
- unusual login behavior

Risk results should support human review for high-impact cases.

---

# 84. DUPLICATE LISTING DETECTION

Use multiple signals:

- property location
- phone
- cadastral identifier
- image similarity
- price
- area
- room count
- text similarity
- ownership/agency relationship

Do not automatically delete potentially legitimate listings based on one signal.

---

# 85. EMAIL/SMS TEMPLATE SYSTEM

Templates must be:

- localized
- versioned
- configurable
- previewable
- testable

Do not embed long email copy in controller code.

---

# 86. FEATURE FLAGS

Use feature flags for:

- new search
- new map
- new subscription system
- AI features
- experimental ranking
- new onboarding
- new verification flow

Flags require owner, status, rollout scope and removal date/plan.

Avoid permanent flag accumulation.

---

# 87. LOGGING

Use structured logs.

Minimum context:

- timestamp
- level
- service/module
- request ID
- trace ID
- actor ID where safe
- organization ID where safe
- event code

Never log secrets or sensitive document content.

---

# 88. BACKUP / DISASTER RECOVERY

Define:

- RPO
- RTO
- backup frequency
- retention
- offsite backup
- restore procedure
- restore testing frequency

Do not claim backups are reliable until restoration has been tested.

---

# 89. DEPLOYMENT STRATEGY

Prefer:

- immutable builds
- environment promotion
- migration checks
- blue/green or rolling deployment where appropriate
- automated rollback where safe

Never deploy schema-breaking changes without compatibility planning.

---

# 90. RELEASE CHECKLIST

Before production release:

```text
[ ] requirements traceability complete
[ ] architecture reviewed
[ ] migrations reviewed
[ ] security scan clean or approved exceptions
[ ] dependency scan clean or approved exceptions
[ ] unit tests pass
[ ] integration tests pass
[ ] E2E tests pass
[ ] critical negative tests pass
[ ] performance budgets pass
[ ] accessibility checks pass
[ ] SEO checks pass
[ ] localization checks pass
[ ] backup verified
[ ] restore test evidence exists
[ ] observability active
[ ] rollback plan documented
[ ] runbooks updated
[ ] file manifest complete
[ ] independent red-team review complete
```

---

# 91. FINAL FILE INVENTORY EXPECTATION

Before declaring project completion, produce:

```text
FILE_MANIFEST.md
```

covering all:

- application source files
- test files
- database migrations
- seeds
- infrastructure files
- configuration
- scripts
- documentation
- OpenAPI
- schemas
- translations
- localization content
- templates

No file should be “unknown”.

---

# 92. FINAL PROJECT DELIVERABLES

At completion, return a structured delivery package containing at minimum:

1. source code
2. database migrations
3. database schema snapshot
4. ERD
5. OpenAPI specification
6. event contracts
7. frontend application
8. admin application
9. worker processes
10. localization files
11. design system
12. automated tests
13. performance report
14. SEO/GEO report
15. security report
16. accessibility report
17. deployment manifests
18. infrastructure code
19. backup/restore documentation
20. operations runbooks
21. ADRs
22. requirements traceability matrix
23. file-by-file audit report
24. final known-limitations report
25. release notes

---

# 93. ABSOLUTE PROHIBITIONS

Never:

- fabricate successful tests
- fabricate API integrations
- invent legal requirements
- invent commission percentages
- invent subscription prices
- silently weaken authentication
- store original user-uploaded images indefinitely against the defined policy
- let frontend-only checks protect business rules
- expose sensitive data in logs
- use internal IDs unnecessarily in public URLs
- hard-code language-specific business logic
- hard-code one country into the architecture
- create insecure admin shortcuts
- add giant dependencies without review
- create unbounded SEO pages
- claim 2-second load speed without measurements
- claim zero bugs
- claim “perfect” security
- claim third-party availability without testing

---

# 94. OPERATING PRINCIPLE: EVIDENCE OVER CONFIDENCE

When choosing between:

- a confident guess
- an explicit open issue

choose the explicit open issue for material unknowns.

When choosing between:

- “probably works”
- a reproducible test

choose the reproducible test.

When choosing between:

- convenient coupling
- clean boundary

choose the clean boundary unless the trade-off is formally justified.

---

# 95. FIRST ACTIONS THE Z.AI AGENT SYSTEM MUST TAKE

Do not start by generating hundreds of files.

Execute this sequence:

### Step 1 — Inventory

Inspect all provided attachments, repositories, documents and previous artifacts.

If files from previous Karen Home architecture work are supplied, inspect them before generating replacements.

### Step 2 — Benchmark

Audit the public reference site:

https://www.myhome.ge/en/

Extract feature requirements only.

Do not copy proprietary implementation.

### Step 3 — Requirement extraction

Convert this master prompt into a traceability matrix.

### Step 4 — Conflict detection

Identify contradictions, ambiguity and missing critical decisions.

Do not guess. Classify each issue:

- blocking
- non-blocking
- configurable
- deferred

### Step 5 — Architecture

Produce system context, domains, deployment, security, data, search, media and event architecture.

### Step 6 — Agent review

Have at least 3 independent agent groups review the architecture before implementation.

### Step 7 — Freeze contracts

Freeze:

- database contract
- API contract
- event contract
- permission contract
- error model

### Step 8 — Implement by vertical slices

Do NOT build every UI page first.

Build vertical slices through:

```text
DB
→ Domain
→ API
→ UI
→ Tests
→ Observability
```

### Step 9 — Audit continuously

After every slice:

- file-by-file review
- test review
- security review
- performance review
- requirements traceability update

### Step 10 — Production certification

Do not declare completion until all gates satisfy their acceptance criteria.

---

# 96. REQUIRED FIRST VERTICAL SLICE

The first full vertical slice should be:

```text
Visitor
 ↓
Registration
 ↓
Email/Mobile verification
 ↓
Google/Facebook option
 ↓
Profile
 ↓
KYC eligibility state
 ↓
Agreement acceptance
 ↓
Create Property
 ↓
Upload Images
 ↓
Image Worker
 ↓
WebP storage
 ↓
Create Listing
 ↓
Moderation
 ↓
Publish
 ↓
Public Listing Detail
 ↓
Search Index
 ↓
Favorite
 ↓
Lead/contact
```

Every layer must be implemented for real.

No simulated publish response.

---

# 97. REQUIRED SECOND VERTICAL SLICE

```text
Published Listing
 ↓
Lead
 ↓
Agent/Owner assignment
 ↓
Viewing
 ↓
Contract
 ↓
Commission calculation
 ↓
Payment
 ↓
Ledger
 ↓
Payout obligation
 ↓
Audit
```

All financial calculations must be deterministic and testable.

---

# 98. REQUIRED ADMIN SLICE

```text
Admin Login
 ↓
RBAC
 ↓
Dashboard
 ↓
Users
 ↓
KYC Review
 ↓
Listing Moderation
 ↓
Commission Rule Management
 ↓
Subscription Management
 ↓
Ad Placement Management
 ↓
System Settings
 ↓
Audit Log
```

No hidden super-admin bypass.

---

# 99. REQUIRED PERFORMANCE SLICE

Create at least:

- one public listing route
- one search route
- one map route
- one property detail route
- one authenticated dashboard route

Measure:

- cold cache
- warm cache
- mobile
- desktop
- representative network

Record evidence.

---

# 100. REQUIRED DOCUMENTATION STYLE

Documentation must be:

- explicit
- current
- implementation-linked
- searchable
- versioned

Avoid documentation that says only “this service manages X”.

State:

- why it exists
- what it owns
- what it does not own
- inputs
- outputs
- security constraints
- data dependencies
- events emitted/consumed
- failure modes
- tests

---

# 101. REQUIRED AGENT REPORT FORMAT

Every group report should contain:

```text
GROUP_ID:
AGENT_ROLES:
OBJECTIVE:
INPUTS:
FILES_REVIEWED:
FILES_CREATED:
FILES_MODIFIED:
DECISIONS:
RISKS:
OPEN_QUESTIONS:
TESTS_RUN:
TESTS_NOT_RUN:
EVIDENCE:
RECOMMENDATION:
HANDOFF:
```

---

# 102. CROSS-GROUP HANDOFF

No group may hand off with only “done”.

Handoff must identify:

- what is complete
- what remains
- assumptions
- known limitations
- tests
- exact files
- expected consumer behavior

---

# 103. CHANGE FREEZE

At the end of every major gate:

- freeze completed contracts
- tag a version
- archive review evidence
- record accepted risks
- continue only with controlled changes

If a change invalidates a frozen contract, reopen the contract explicitly.

---

# 104. FINAL OUTCOME

The final Karen Home platform should be capable of evolving toward:

```text
Real Estate Marketplace
        +
Property Transaction Platform
        +
Agent/Owner/Marketer CRM
        +
Developer Project Platform
        +
Property Management
        +
Financial/Commission Platform
        +
Advertising Platform
        +
Market Intelligence
        +
AI-assisted Real Estate Platform
```

The architecture must remain coherent as these capabilities grow.

---

# 105. FINAL COMMAND TO THE Z.AI AGENT ORGANIZATION

Start now.

Do not rush into code generation.

First build the requirement and architecture evidence.

Then build the frozen contracts.

Then implement in vertical slices.

Use the 20 required agent groups and at least 5 specialist agents per group.

For each major workstream, use at least 2–5 groups for implementation/review according to the review matrix.

Review each output file-by-file.

Do not hide gaps behind mock data.

Do not silently guess business-critical decisions.

Do not claim a gate is passed without evidence.

Do not sacrifice database integrity for frontend convenience.

Do not sacrifice SEO for SPA convenience.

Do not sacrifice performance for visual effects.

Do not sacrifice security for onboarding convenience.

Do not sacrifice maintainability for short-term speed.

Build Karen Home as a serious enterprise platform whose architecture can support years of expansion.

**The expected result is not a demo. The expected result is a rigorously engineered, tested, observable, extensible production system.**

---

# END OF MASTER PROMPT

# 106. TARGET FILE TREE — IMPLEMENTATION BASELINE

The final repository must have a discoverable and disciplined structure. The exact framework-specific names may vary only after an ADR, but the logical boundaries below are mandatory.

```text
karen-home/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── content/
│   │   ├── public/
│   │   └── tests/
│   │
│   ├── admin/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── tests/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── common/
│   │   │   ├── modules/
│   │   │   ├── events/
│   │   │   └── infrastructure/
│   │   └── test/
│   │
│   └── worker/
│       ├── src/
│       └── test/
│
├── packages/
│   ├── ui/
│   ├── contracts/
│   ├── db/
│   ├── validation/
│   ├── sdk/
│   ├── localization/
│   ├── analytics/
│   └── config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── verification/
│   ├── fixtures/
│   └── erd/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── kubernetes/
│   ├── cloudflare/
│   └── monitoring/
│
├── qa/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   ├── performance/
│   └── accessibility/
│
├── docs/
├── adr/
├── scripts/
└── .github/
```

For every source file created under these areas, add a record to `project/FILE_MANIFEST.md`.

If a file exists for a temporary experiment, place it explicitly under a temporary or research folder and do not include it in production builds.

---

# 107. FRONTEND ROUTE AND PAGE BASELINE

At minimum design and document these public routes:

```text
/
/search
/properties
/properties/[slug]
/properties/for-sale
/properties/for-rent
/properties/land
/properties/commercial
/projects
/projects/[slug]
/agents
/agents/[slug]
/agencies
/agencies/[slug]
/locations
/locations/[country]
/locations/[country]/[city]
/locations/[country]/[city]/[district]
/about
/contact
/help
/legal/terms
/legal/privacy
```

Authentication flows must support:

```text
/login
/register
/verify-email
/verify-mobile
/forgot-password
/reset-password
```

The normal visual experience may be modal, but the routes above must still be directly accessible.

Authenticated user routes should include a clearly separated dashboard namespace, such as:

```text
/dashboard
/dashboard/profile
/dashboard/favorites
/dashboard/saved-searches
/dashboard/viewings
/dashboard/messages
/dashboard/subscription
/dashboard/settings
```

Owner:

```text
/owner
/owner/properties
/owner/listings
/owner/leads
/owner/viewings
/owner/contracts
/owner/commissions
/owner/payouts
/owner/settings
```

Agent:

```text
/agent
/agent/listings
/agent/leads
/agent/clients
/agent/viewings
/agent/contracts
/agent/commissions
/agent/team
/agent/settings
```

Marketer:

```text
/marketer
/marketer/referrals
/marketer/leads
/marketer/deals
/marketer/commissions
/marketer/payouts
/marketer/campaigns
/marketer/settings
```

Admin:

```text
/admin
/admin/users
/admin/organizations
/admin/properties
/admin/listings
/admin/verification
/admin/moderation
/admin/payments
/admin/commissions
/admin/subscriptions
/admin/promotions
/admin/ads
/admin/seo
/admin/cms
/admin/translations
/admin/analytics
/admin/settings
/admin/audit
/admin/system
```

These are route families, not necessarily the final exact URL syntax. The final URL strategy must be documented before implementation.

---

# 108. BACKEND MODULE FILE BASELINE

Each material backend domain should follow a consistent internal shape.

For example, `listings` should contain, conceptually:

```text
listings/
├── presentation/
│   ├── listings.controller.ts
│   ├── listing-public.controller.ts
│   └── dto/
│       ├── create-listing.dto.ts
│       ├── update-listing.dto.ts
│       ├── publish-listing.dto.ts
│       └── listing-response.dto.ts
│
├── application/
│   ├── commands/
│   │   ├── create-listing.command.ts
│   │   ├── update-listing.command.ts
│   │   ├── publish-listing.command.ts
│   │   └── archive-listing.command.ts
│   ├── queries/
│   │   ├── get-listing.query.ts
│   │   └── list-user-listings.query.ts
│   ├── handlers/
│   └── services/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── state-machine/
│   ├── events/
│   └── repositories/
│
└── infrastructure/
    ├── persistence/
    ├── search/
    └── mappers/
```

Apply the same structural discipline to:

- identity
- organizations
- properties
- search
- projects
- CRM
- billing
- verification
- moderation
- ads
- contracts
- rentals
- notifications

Do not create a different architectural style for every module.

---

# 109. DATABASE OBJECT BASELINE

At minimum, the database design must cover the following domain families. The exact number of tables is not prescribed; completeness is.

### IAM

- users
- user_credentials
- user_sessions
- oauth_identities
- passkeys if supported
- verification factors
- security events

### Organizations

- organizations
- organization_members
- roles
- permissions
- role_permissions
- member_roles

### Geography

- geo_nodes
- geo_translations
- geo_aliases
- addresses where required

### Properties

- properties
- property_locations
- property_owners
- property_documents
- property_amenities
- property subtype detail tables

### Marketplace

- listings
- listing_prices
- listing_status_history
- listing_media
- listing_documents
- favorites
- saved_searches
- saved_search_matches
- listing_reports

### Projects

- projects
- project_buildings
- project_floors
- project_units
- project_payment_plans

### CRM

- leads
- lead_activities
- crm_tasks
- viewings
- deals

### Messaging

- conversations
- conversation_members
- messages
- message_attachments

### Billing

- products
- orders
- payments
- refunds
- invoices
- subscriptions
- subscription_entitlements
- ledger_accounts
- ledger_transactions
- ledger_entries
- payout_requests
- payouts

### Commission

- commission_rules
- commission_rule_versions
- commission_calculations
- commission_participants
- commission_adjustments

### Verification

- verification_cases
- verification_documents
- verification_checks
- verification_decisions

### Moderation/Risk

- reports
- moderation_cases
- fraud_cases
- risk_signals

### Advertising

- ad_placements
- advertisers
- campaigns
- creatives
- campaign_targets
- campaign_budget_events
- ad_impressions
- ad_clicks

### Contracts

- contract_templates
- contract_versions
- contracts
- contract_parties
- contract_properties
- contract_signatures
- legal_acceptances

### Rentals

- leases
- lease_parties
- rent_schedules
- rent_payments
- property_maintenance

### Analytics/Operations

- event records where transactional retention requires them
- audit_logs
- outbox_events
- system_settings
- feature_flags

Do not blindly create every table above if a validated domain decision shows a better model. Document deviations through ADRs.

---

# 110. API FAMILY BASELINE

The first OpenAPI contract should include families such as:

```text
/auth
/users
/organizations
/roles
/permissions
/properties
/property-types
/amenities
/locations
/listings
/search
/maps
/favorites
/saved-searches
/agents
/marketers
/projects
/leads
/viewings
/messages
/contracts
/verification
/moderation
/payments
/orders
/invoices
/subscriptions
/commissions
/payouts
/ads
/campaigns
/notifications
/reviews
/valuation
/analytics
/admin/*
```

For every endpoint document:

- authentication requirement
- organization scope if any
- required permission
- request schema
- response schema
- error codes
- pagination
- idempotency behavior where applicable
- side effects/events
- audit behavior

---

# 111. ADMIN NAVIGATION BASELINE

The admin application should expose a disciplined navigation tree similar to:

```text
Overview

Users & Identity
  Users
  Sessions
  Verification
  Security Events

Organizations
  Agencies
  Developers
  Service Providers
  Memberships

Real Estate
  Properties
  Listings
  Projects
  Locations
  Amenities

Trust & Safety
  KYC
  Moderation
  Reports
  Fraud/Risk

Commercial
  Orders
  Payments
  Invoices
  Subscriptions
  Promotions
  Commissions
  Payouts

Advertising
  Advertisers
  Placements
  Campaigns
  Creatives
  Reports

CRM
  Leads
  Viewings
  Deals

Content
  CMS
  Pages
  SEO
  Translations

Communication
  Email Templates
  SMS Templates
  Notifications

Analytics
  Marketplace
  Financial
  Advertising
  System

System
  Settings
  Feature Flags
  Integrations
  Jobs/Queues
  Audit Logs
  Health
```

Each menu item must map to permissions and audit behavior.

---

# 112. USER DASHBOARD BASELINE

Normal visitor/user must receive a simple dashboard, not a professional seller console.

Core modules:

- profile
- favorites
- saved searches
- alerts
- compare
- messages
- viewing requests
- subscription
- billing history where applicable
- language/currency
- privacy/security

Do not overwhelm ordinary users with commission, CRM or professional modules.

---

# 113. UX STATE COMPLETENESS

Every important component must specify at least:

- default
- loading
- empty
- populated
- validation error
- server error
- permission denied
- unavailable
- retrying
- success confirmation
- disabled
- optimistic/pending state where used

Every major form must specify:

- field help
- required indicator
- inline validation
- server validation
- recovery path
- preservation of entered data where safe

---

# 114. DESIGN TOKEN BASELINE

The design system must centralize:

- colors
- typography
- spacing
- radii
- shadows
- borders
- breakpoints
- z-index scale
- motion durations
- motion easing
- component states

All scalable dimensions must be rem-based or use other responsive units as defined earlier.

Do not scatter raw numeric values throughout components.

---

# 115. TEST COVERAGE EXPECTATIONS

Do not optimize for a single global percentage only.

Set minimum coverage expectations by risk domain.

Higher coverage should be required for:

- authentication
- authorization
- KYC
- commission
- payment
- ledger
- listing state machine
- contract state
- migrations
- permission-sensitive admin operations

For critical financial/security logic, branch coverage and mutation testing should be considered.

A high coverage number does not compensate for missing critical scenarios.

---

# 116. SECURITY THREAT MODEL

Before production, produce a threat model covering at minimum:

- account takeover
- credential stuffing
- OAuth account takeover
- session theft
- refresh-token reuse
- privilege escalation
- broken object-level authorization
- organization data leakage
- IDOR
- file upload attacks
- SSRF
- XSS
- CSRF
- SQL injection
- mass assignment
- webhook spoofing
- payment manipulation
- commission manipulation
- admin abuse
- data exfiltration
- bot abuse
- scraping/harvesting
- fake listings
- document theft
- spam
- ad injection

Every critical threat needs mitigation and test evidence.

---

# 117. SEO PAGE TEMPLATE BASELINE

Define reusable templates for:

### Property detail

- title
- meta description
- canonical
- locale
- breadcrumbs
- property facts
- location
- agent/owner context where public
- images
- structured data
- related properties
- nearby content

### Location page

- unique introduction
- market summary
- property types
- listing counts where reliable
- related locations
- useful FAQs
- internal links
- structured data where relevant

### Agent/Agency page

- verified profile data
- listings
- service areas
- languages
- contact routes
- structured data where appropriate

### Project page

- developer
- project status
- buildings
- units
- prices where public
- payment options where public
- location
- media
- contact

Never generate thin pages solely from database permutations.

---

# 118. PERFORMANCE TEST SCENARIOS

At minimum test:

1. Homepage anonymous cold cache.
2. Homepage anonymous warm cache.
3. Search page with multiple filters.
4. Search page with map viewport.
5. Property detail with 15–30 media assets.
6. Project detail.
7. User dashboard.
8. Admin listing table.
9. Listing creation flow.
10. Image upload/processing workflow.

Load testing should include realistic concurrency and ramp profiles.

Document the environment and workload so results are reproducible.

---

# 119. AGENT EXECUTION WAVES

Use controlled execution waves.

### Wave A — Research and Governance

G01,G02,G14,G19,G20

### Wave B — Architecture and Data

G01,G06,G07,G08,G10,G15,G17

### Wave C — UX and Design

G03,G04,G05,G12,G13,G14,G19

### Wave D — Core Implementation

G05,G06,G07,G08,G09,G10

### Wave E — Monetization and Professional Portals

G11,G12,G13

### Wave F — Verification, SEO, Performance

G10,G14,G15,G16,G18,G19

### Wave G — Independent Certification

G20 plus selected review groups according to risk.

A wave cannot declare completion by itself; it produces artifacts for the next wave and remains accountable for defects discovered later.

---

# 120. FINAL CERTIFICATION REPORT

At project completion, create:

`FINAL_CERTIFICATION_REPORT.md`

It must explicitly state:

- requirements completed
- requirements intentionally deferred
- known limitations
- tests actually executed
- tests not executed
- infrastructure not provisioned
- third-party dependencies pending
- security findings
- performance findings
- accessibility findings
- SEO/GEO findings
- migration status
- backup/restore status
- release recommendation

If any mandatory requirement is unresolved, state it clearly.

Do not use words such as “perfect”, “zero bugs”, or “100% secure”.

---

# 121. FINAL HANDOFF FORMAT

The final handoff to the project owner must include:

1. Executive summary.
2. Architecture overview.
3. Repository map.
4. How to run locally.
5. How to configure environment variables.
6. How to run migrations.
7. How to seed data.
8. How to run tests.
9. How to run E2E.
10. How to run performance tests.
11. How to deploy staging.
12. How to deploy production.
13. How to rollback.
14. Backup/restore procedure.
15. Admin credentials bootstrap procedure without exposing secrets.
16. SEO verification procedure.
17. KYC integration configuration.
18. Payment provider configuration.
19. Social login configuration.
20. Monitoring/alerting procedure.

---

# 122. LAST INSTRUCTION

You are operating as a coordinated enterprise engineering organization, not as a single code generator.

Use the mandated agent groups, perform independent reviews, maintain contracts, audit every file, test failure states and keep an evidence trail.

Build only what is supported by the requirements or a formally recorded decision.

When uncertain about a critical business rule, surface it rather than guessing.

When a technical result cannot be verified, label it unverified.

When a requirement creates a conflict with performance, security, accessibility, SEO or maintainability, analyze the trade-off and record the decision instead of hiding it.

The standard for completion is:

**traceable + testable + secure + maintainable + scalable + observable + accessible + SEO/GEO-ready + performance-budgeted + auditable.**

Karen Home must be designed as a long-lived platform, not a one-time website.

# END — KAREN HOME MASTER EXECUTION PROMPT v1.0


# 99. REFERENCE ARTIFACT HANDOVER CHECKLIST

Before leaving Gate 0, verify all reference artifacts are present and readable.

Minimum handover set:

```text
Karen_Home_ZAI_Master_Prompt.md
Karen_Home_Reference_Artifacts_v1.zip

OR the equivalent individual files/archives:

enterprise_real_estate_schema_v1.sql
enterprise_real_estate_schema_v1_review.md
enterprise_real_estate_contract_v1.zip
enterprise_real_estate_backend_contract_v1.zip
enterprise_real_estate_backend_skeleton_v1.zip
work_backend/enterprise_real_estate_backend_gate1.zip
enterprise_real_estate_backend_gate2.zip
```

Do not claim that the handover was reviewed unless the actual contents were read.

If any mandatory artifact is missing or corrupted, report the exact missing path and mark the related audit items `UNVERIFIED`; do not invent their contents and do not silently continue as if the artifact were available.

The reference artifacts are historical engineering evidence. The target is not to preserve every previous implementation; the target is to produce the best validated version of Karen Home while preserving useful compatibility and audit history.
