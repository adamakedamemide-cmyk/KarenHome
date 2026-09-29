# W0_OPEN_DECISIONS.md — 最终状态（W0 Finalized，2026-09-29）

**决议记录**：以下 7 项决策由项目所有者于 2026-09-29 正式批准（原文引用见各 ADR）。
**原则保持**：除所有者明文批准外，无任何业务数值被代填；`TBD / CONFIGURABLE / UNDECIDED` 词汇表保持有效。

---

## 一、已批准决策（APPROVED — 用户决议原文要点）

| ID | 决议 | 批准内容摘要 | 落地 ADR | 落地证据 |
|---|---|---|---|---|
| **OD-01** ✅ | Source of Truth | 当前 Master Prompt 版本（SHA `bcdebe3a…`）与当前 Requirements 为项目最高参考。信任层级：**Current Requirements > Approved ADRs > Validated Current Contracts > Historical Reference Artifacts > Implementation Artifacts**。冲突必须登记并经 ADR 解决 | ADR-0010 | docs/reference/README.md（归档 + 层级条款） |
| **OD-02** ✅ | Jurisdiction / KYC | 架构自始 **Jurisdiction-Agnostic**；不 Hard-code 任何国家。KYC Provider / Document Types / Verification Levels / Required Fields / Expiration Rules / Policies 全部 **Configuration/Policy-driven**。`LAUNCH_JURISDICTION = TBD` 但架构、数据库、API 不因 TBD 停滞。不猜测任何国家法律/税务/身份规则 | ADR-0011 | verification schema（frozen，已有 cases/documents 表）+ 配置键预留（platform.settings）；KYC provider adapter = Gate 4 范围 |
| **OD-03** ✅ | Commission / Subscription | 模型批准但**零数值发明**。Engine 完全 configurable + versioned，支持维度：Owner / Agent / Marketer / Organization / Transaction Type / Property Type / Geography / Price Band / Campaign / Referral。**所有 Calculation 必须 Snapshot**。Subscription Plan/Entitlement config-driven。未知值仅用 TBD / CONFIGURABLE / UNDECIDED。Seed 禁入虚构值 | ADR-0012 | 0027（7 表 + snapshot 不可变触发器，rules 表空）+ billing.products/prices（frozen，无 plan 价格种子） |
| **OD-04** ✅ | Advertising MVP | Advertising Platform 确认为独立域，11 表架构（Advertiser/Campaign/Campaign Group/Ad Slot/Creative/Targeting/Impression/Click/Budget/Billing/Reporting）。MVP 页面：Homepage/Search/Listing Detail/Agency/Agent/Project/Geo Pages。**Auction/RTB/Ad Exchange 明确不入 MVP**（无 bid 表）。禁止猜测 CTR/CPM/CPC | ADR-0013 | 0028（11 表 + 11 MVP slots + fraud 控制 + 零定价种子） |
| **OD-08** ✅ | Authorization Model | 两层授权批准：**Personal Scope**（user-owned resources）+ **Organization Scope**（membership/role/permission/assignment）。适用于 Property/Listing/Lead/Contract/Payment/Commission/Verification/Documents。**Owner 个人永不被迫建 Organization**。Agent/Marketer/Agency/Developer 可用 Org Scope。**UI visibility ≠ Backend Authorization** | ADR-0014 | 0030（user_permission_grants + listing_assignments + effective_permissions() 两层解析函数）+ 实测 IAM-14/W0 |
| **OD-09** ✅ | Derived Listing States | Canonical State Machine 是唯一真相源。Derived 状态仅可作为 **Read Model / Projection / Computed State**，除非后续有强理由并登记为 Persist。任何 Derived 状态**不得**绕过 State Machine 修改 Canonical Status | ADR-0015 | 0031（v_listing_derived_status 视图 = 纯投影；实测无写路径） |
| **OD-13** ✅ | Schema / Contract Evolution | Freeze 后的每个变更必须具备：**ADR + Migration + Schema Diff + Regression Tests + Contract Update**。**禁止直接 overwrite Frozen Schema 文件** | ADR-0016 | 0024-fixed（provenance SHA 变体而非原位改写）+ 0027..0031（编号迁移）+ schema-diff（REMOVED=0）+ 回归套件 37/37 |

## 二、正式登记的更正（用户决议）

1. **CR-05（"ash]" 文件损坏）= FALSE POSITIVE**（display artifact）——从 Decision Log 的 Defect 名单移除，保留为历史审计勘误。字节级证据：`od -c`（W0-CF-01）。
2. **Errata 0024 缺陷已修复** —— PostgreSQL 16 以 **0 ERROR** 接受（fresh apply 证据：g3-apply-fresh.log）。
3. **先前无真实执行的 Build 报告 = Historical Evidence** —— 自此以 **Execution Evidence** 为唯一有效性基准。

## 三、Reference Bundle 决议

- Bundle 已归档至工作区 `docs/reference/` 并记录 SHA-256（`af3a60e5…`）。
- 临时外部 URL（tmpfiles）**不再作为** Production/Build 依赖。

## 四、仍开放（未批准 = 维持原状态）

| ID | 内容 | 状态 |
|---|---|---|
| OD-02 执行侧 | `LAUNCH_JURISDICTION` 具体国家 | TBD（架构已兼容，Gate 4/6 需要时再批） |
| OD-03 数值侧 | Commission 百分比 / Subscription 价格 | UNDECIDED（engine 就绪等数值） |
| OD-04 运行侧 | Ads 运行时部署范围 | 设计已批；runtime = Gate 6 |
| W0-OD-16 | Ledger retention / reversal 窗口 | 待法律侧输入（immutability 已实证） |
| W0-OD-17 | ADR-0001..0009 一揽子批准 | **由本决议取代**：OD-01..13 已逐项批准，ADR-0010..0017 新增 |
| W0-OD-18 | RGM runner CI 命名 | 技术项，Gate 4 定 |

## 五、结论

**W0 全部 Blocking Human Decisions（B-1）已解除。** W0-Finalize 执行细节见 `W0_FINALIZATION.md`；Gate 3-DB 执行见 `GATE3_DB_EXECUTION_REPORT.md`。
