# Reference Bundle Archive — Karen Home

**决策来源**: OD 决议（用户批准，2026-09-29）— "Reference Bundle must be archived and hashed inside the Project Workspace; temporary external URLs must never be a production or build dependency."

## 归档内容

| 文件 | SHA-256 | 说明 |
|---|---|---|
| `Karen_Home_Reference_Bundle_af3a60e5.zip` | `af3a60e5af59fc1f90fe9c5edfd9e5dddd8afe8faf4d0de49baf3c5c00b4982a` | 外部 Bundle（tmpfiles 原件字节级拷贝，351,458 bytes） |

## Bundle 内部完整性（解包核验 2026-09-29）

| 内部工件 | SHA-256 |
|---|---|
| `Karen_Home_ZAI_Master_Prompt (1).md` | `bcdebe3ad069a754bafbc6ed6e464195596074787625549801c0fe025ca4d1b6` |
| `Karen_Home_Reference_Artifacts_v1.zip` | `9c43fec79fdada593344606bf01c4ec7ac461f00cf0b2a5f5e4b37c62ebf8a63` |

Artifacts 内含 360 个唯一文件（00_schema_and_freeze / 01_backend_contract / 02_backend_skeleton / 03_backend_gate1 / 04_backend_gate2 / 99_original_archives），其中 99_original_archives 的 4 个 ZIP 与顶层目录字节级一致（dedup 确认，沿用 Gate 0-R 结论）。

## 验证命令

```bash
sha256sum -c << 'EOF'
af3a60e5af59fc1f90fe9c5edfd9e5dddd8afe8faf4d0de49baf3c5c00b4982a  Karen_Home_Reference_Bundle_af3a60e5.zip
EOF
```

## 规则

1. 此目录为 **只读 Reference Snapshot** —— 任何修改必须经 ADR + 用户批准。
2. `downloads.zip`（tmpfiles）仅作为历史获取渠道记录；本归档是唯一权威来源。
3. Master Prompt 的权威文本由 OD-01（已批准）锁定为当前版本（SHA bcdebe3a…）。
4. 与 Current Requirements 冲突时按 OD-01 信任层级裁决：Current Requirements > Approved ADRs > Validated Current Contracts > Historical Reference Artifacts > Implementation Artifacts。
