# GATE4_RECOVERY_REPORT

## Recovery capability verification

- **Environment:** reconstructible from scratch — the Gate 3 recovery path (micromamba env `karen`: PostgreSQL 16.10 + PostGIS + Redis; Node 24 + pnpm 10.15) was already proven after a sandbox reset and remains valid; Gate 4 adds only npm dependencies (sharp, @fastify/multipart, @fastify/static, nodemailer, ioredis) which `pnpm install` resolves from the lockfile.
- **Database:** full chain applies cleanly on a virgin database — proven twice this gate: `scripts/apply-all-migrations.sh karen_g4_fresh` → **13/13 steps, 0 ERROR** (`evidence/g4-apply-fresh.log`), followed by 37/37 + 22/22 verification suites.
- **Applications:** `pnpm build` compiles all four packages; `apps/api` boots (verified live during benchmarks); `apps/worker` starts against a migrated DB (DATABASE_URL + JWT secret env required).
- **Artifacts:** every Gate 4 deliverable exists in the self-contained archive (git tag `gate4-final` + SHA-256 manifest) — no critical artifact lives only in a temporary workspace (§0.9).

## One-session recovery procedure (see RECOVERY.md)

1. Install micromamba env `karen`; start PostgreSQL/Redis.
2. `createdb karen_g4_fresh` → run `scripts/apply-all-migrations.sh karen_g4_fresh`.
3. Run both verification suites (expected 37/37 + 22/22).
4. `pnpm install && pnpm build` → run API + worker with env from `.env.example` (JWT_SECRET ≥ 43 chars).
5. Restore code from archive/git tag; verify SHA-256s against FILE_MANIFEST.

## Honest notes

- Sandbox reset during Gate 4 destroyed nothing because every deliverable was written through to `/home/z/my-project/download/` and committed to git — the §0 discipline was exercised, not assumed.
- Worker process supervision (systemd-style restart) is deployment-level; graceful-shutdown code path is in place.
