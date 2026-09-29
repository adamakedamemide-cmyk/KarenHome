# Karen Home — ADR 注册表（ADR-0001..0017）
**日期**: 2026-09-29 · **状态**: OD-01..09/13 已批准后定稿

> **Provenance 说明（诚实登记）**: 本 ADR 文件在沙箱重置后依据 worklog 记录与用户批准决议**重建**。ADR-0001..0009 的原始全文遗失，此处登记其编号/主题/状态（与 Gate 0-R 与 W0 worklog 一致）；ADR-0010..0017 为本次 W0-Finalize 全文新写。重建事实本身按 OD-01 层级登记。

---

## 既有 ADR（主题登记，原文遗失）

| ID | 主题 | 状态 |
|---|---|---|
| ADR-0001 | 锁定 Master Prompt 版本 v1.1 | APPROVED（经 OD-01 重申） |
| ADR-0002 | PostGIS/geo 模型采纳 | APPROVED（历史） |
| ADR-0003 | 两层权限模型（Organization + Personal） | APPROVED（经 OD-08 批准 + 0030 落地） |
| ADR-0004 | Outbox pattern + audit.outbox_events | APPROVED（历史） |
| ADR-0005 | Schema Freeze 拆分 + 编号迁移制 | APPROVED（历史；经 OD-13 重申） |
| ADR-0006 | citext/email + argon2id 凭证策略 | APPROVED（历史） |
| ADR-0007 | Listing 版本字段（0024 version 列） | APPROVED（历史） |
| ADR-0008 | Worker app + outbox consumer 形态 | APPROVED（历史；Gate 3+ 实施） |
| ADR-0009 | Media 管线架构（hash/pHash/dedup） | APPROVED（历史；Gate 5 runtime） |

## 新增 ADR（本次全文批准）

### ADR-0010 — Source of Truth 层级与 Reference Bundle 归档（OD-01）
- **Decision**: 信任层级固定为 Current Requirements > Approved ADRs > Validated Current Contracts > Historical Reference Artifacts > Implementation Artifacts；Master Prompt 当前版本（SHA `bcdebe3a…`）为权威文本；Reference Bundle 归档于 `docs/reference/`（SHA `af3a60e5…`），临时外部 URL 不得作为 build/production 依赖。
- **Consequences**: 冲突必须登记并以 ADR 裁决；历史审计报告（含误报 CR-05）降级为 Historical Evidence。
- **Status**: APPROVED 2026-09-29。

### ADR-0011 — Jurisdiction-Agnostic 架构与可换装 KYC（OD-02）
- **Decision**: 不 hard-code 任何国家规则；KYC Provider/Document Types/Verification Levels/Required Fields/Expiration Rules/Verification Policies 全部 configuration/policy-driven；`LAUNCH_JURISDICTION=TBD` 不阻塞架构、DB、API；禁止猜测特定国家法律/税务/身份规则。
- **Consequences**: verification 域 schema 保持 provider-neutral；provider adapter 与规则引擎在 Gate 4/6 以配置注入。
- **Status**: APPROVED 2026-09-29。

### ADR-0012 — Config-driven、Versioned、Snapshot 制的 Commission/Subscription 引擎（OD-03）
- **Decision**: Commission 7 表独立域（rules/rule_versions/calculations/calculation_lines/settlements/adjustments/payouts）；规则变更不重算历史（calculations 快照不可变，DB 触发器强制）；支持 10 维度（Owner/Agent/Marketer/Organization/Transaction Type/Property Type/Geography/Price Band/Campaign/Referral）；Subscription Plan/Entitlement config-driven；零业务数值种子（TBD/CONFIGURABLE/UNDECIDED 词汇表）。
- **Consequences**: 首个 runtime calculation 前必须完成数值 seed（Gate 6 checklist）；无百分比默认值。
- **Status**: APPROVED 2026-09-29；落地 = migration 0027。

### ADR-0013 — Advertising MVP 范围（OD-04）
- **Decision**: 独立 advertising 域 11 表；MVP 投放位覆盖 Homepage/Search/Listing Detail/Agency/Agent/Project/Geo Pages（+Category/Dashboard 预留）；**无 Auction/RTB/Ad Exchange**（不建 bid 表）；定价字段全部 NULL/UNDECIDED 出厂；fraud 控制（IP/UA 哈希、validity、fraud_score、session 级 impression 去重）内建。
- **Status**: APPROVED 2026-09-29；落地 = migration 0028。

### ADR-0014 — 两层授权模型（OD-08，取代 ADR-0003 的待批状态）
- **Decision**: Personal Scope（user-owned resources）与 Organization Scope（membership+role+permission+assignment）并行；适用域 8 类资源；Individual Owner 无需 Organization；Agent/Marketer/Agency/Developer 走 Org Scope + assignment；UI 隐藏 ≠ 后端授权；资源访问 = User Ownership + Org Membership + Agency Assignment + Listing Assignment + Role Permission + Platform Role。
- **Consequences**: `iam.effective_permissions()` 统一解析（DB 级可测）；IAM-14 缺口（org-only permission）由 0030 修复；前端不得以隐藏代替授权检查。
- **Status**: APPROVED 2026-09-29；落地 = migration 0030。

### ADR-0015 — Derived Listing States 仅作投影（OD-09）
- **Decision**: Canonical State Machine（12 态 + transition matrix）为唯一真相源；derived 状态只允许 Read Model/Projection/Computed State（`marketplace.v_listing_derived_status`）；任何 derived 状态不得独立修改 canonical status；如需持久化须另立 ADR。
- **Status**: APPROVED 2026-09-29；落地 = migration 0031。

### ADR-0016 — Freeze 后 Schema 演进协议（OD-13，细化 ADR-0005）
- **Decision**: 任何冻结后的变更必须具备五件套：ADR + 编号 Migration + Schema Diff 证据 + Regression Tests + Contract Update；**禁止 overwrite Frozen Schema 文件**；对冻结函数的修正通过编号迁移中的 CREATE OR REPLACE（0024-fixed 与 0031 为已批先例），原文件以 provenance SHA 保留。
- **Status**: APPROVED 2026-09-29；执行证据 = g3-schema-diff.json（REMOVED=0）。

### ADR-0017 — CI/验证基线（W0 执行结论制度化）
- **Decision**: `pnpm lint / typecheck / build / test` 为 CI 必过项（lint 已定义，eslint+typescript-eslint，exit 0）；DB 变更必须通过 `apply-all-migrations.sh` 全链 fresh-apply 0-ERROR + g3-verification.sql 全 PASS + g3-concurrency 全 PASS；每次迁移后生成 schema snapshot（pg_dump + SHA-256）。
- **Status**: APPROVED 2026-09-29。
