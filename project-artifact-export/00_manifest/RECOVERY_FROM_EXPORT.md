# RECOVERY_FROM_EXPORT.md — Karen Home

How to go from **only this ZIP** (`Karen_Home_Project_Artifacts_CURRENT_v1.zip`) to the exact verified current state in one session. No secrets are required and none are included.

## 0. What is in the bundle

```
project-artifact-export/
├── 00_manifest/          ← 11 governance docs (manifest, SHA256SUMS, exclusions, redactions, state, recovery, counts, git state, category index)
├── workspace/            ← EXACT original-path mirror of all 756 project files
│   ├── download/         (gate reports, evidence, schema snapshots, manifests, prior archive)
│   ├── w0-work/backend/  (full backend monorepo: apps/api, apps/worker, packages/db, packages/contracts, database/, docs/, scripts/)
│   ├── w0-rebuild/       (reference artifacts + provenance bundles)
│   ├── worklog.md, .gitignore, .env
└── 99_original_paths/    ← original-path index
```

## 1. Verify the bundle itself first

```bash
unzip Karen_Home_Project_Artifacts_CURRENT_v1.zip -d restore/
cd restore/project-artifact-export
sha256sum -c 00_manifest/SHA256SUMS        # expect: every line OK
# counts are registered in 00_manifest/FILE_COUNTS.txt
```

## 2. Restore the source

```bash
cp -a workspace/w0-work ./w0-work           # backend monorepo at HEAD dc2eb5c
cd w0-work/backend
```

Original paths are preserved 1:1 under `workspace/`; nothing needs renaming.

## 3. Install the toolchain (micromamba path used by this project)

```bash
export MAMBA_ROOT_PREFIX=$HOME/micromamba
curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj bin/micromamba
micromamba create -n karen -c conda-forge postgresql=16.10 postgis=3.5 redis pnpm nodejs=24 -y
export PATH=$MAMBA_ROOT_PREFIX/envs/karen/bin:$PATH
node --version    # expect v24.x
pnpm --version    # expect 10.15.0
```

Docker alternative for PostgreSQL+PostGIS: use `w0-work/backend/docker-compose.postgres.yml` — set your own `POSTGRES_PASSWORD` first (the default was redacted in this export; see `00_manifest/SENSITIVE_DATA_REDACTIONS.md`).

## 4. Configure environment (no secrets in the bundle)

```bash
cd w0-work/backend
cp .env.example .env
# then edit .env:
#   DATABASE_URL=postgresql://<user>:<YOUR-OWN-PASSWORD>@127.0.0.1:5432/real_estate
#   JWT_SECRET=<generate 43+ random chars, e.g.: openssl rand -base64 48>
#   other keys already have safe dev defaults in .env.example
```

**Never** reuse any value from this export as a production secret — all real credentials are intentionally absent (redaction register: `00_manifest/SENSITIVE_DATA_REDACTIONS.md`).

## 5. Recreate the database + run migrations

```bash
initdb -D $MAMBA_ROOT_PREFIX/envs/karen/pgdata        # if no cluster yet
pg_ctl -D $MAMBA_ROOT_PREFIX/envs/karen/pgdata -l /tmp/pg.log start
redis-server --daemonize yes

createdb -h 127.0.0.1 -U postgres karen_g4_fresh
createdb -h 127.0.0.1 -U postgres karen_ere           # optional main working DB
./scripts/apply-all-migrations.sh karen_g4_fresh      # expect: 13/13 steps, 0 ERROR (ledger-tracked, head = 0034)
```

## 6. Run the verification suites (reproduce Gate 4 evidence)

```bash
pnpm install                                   # lockfile = pnpm-lock.yaml
pnpm typecheck && pnpm lint && pnpm build      # expect 0 / 0 / success (4 packages)
RUN_DB_TESTS=1 pnpm test                       # expect 60/60 (12 suites)
psql -d karen_g4_fresh -f database/verify/g3-verification.sql   # expect 37/37 PASS
psql -d karen_g4_fresh -f database/verify/g4-verification.sql   # expect 22/22 PASS
node scripts/g4-concurrency.js "postgresql://postgres@127.0.0.1:5432/karen_g4_fresh"  # expect 5/5 PASS
```

## 7. Start API and Workers

```bash
# API (port 3000)
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/karen_g4_fresh \
JWT_SECRET='<your 43+ char secret>' PORT=3000 node apps/api/dist/main.js

# Worker (media, search indexer, outbox, notifications, email, sms, fraud, analytics, cleanup)
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/karen_g4_fresh \
JWT_SECRET='<your 43+ char secret>' node apps/worker/dist/main.js
```

`dist/` is committed; if you prefer building from source: `pnpm build` (output replaces `dist/`).

## 8. Restore the EXACT current state (bit-fidelity checklist)

| Step | Command / Check | Expected |
|---|---|---|
| Code matches HEAD | files under `workspace/` vs SHA256SUMS | all OK |
| Code matches git | `git init && git add -A && git commit` then compare tree hash — or trust `00_manifest/GIT_STATE.txt` (HEAD `dc2eb5c`, tag `gate4-final`, clean tree) | recorded state |
| Schema matches snapshot | `pg_dump` your rebuilt DB and diff against `workspace/download/gate4/schema-snapshot-g4.sql` | equivalent (names/order may vary) |
| Gate reports intact | `sha256sum -c workspace/download/gate4/FILE_MANIFEST.sha256` (run from a dir where those relative paths resolve — they are shipped under `workspace/`) | all OK |
| Evidence chain | reference Master Prompt `bcdebe3a…`, reference bundle `af3a60e5…` / `9c43fec7…` — recomputable from `workspace/w0-rebuild/` | match |

## 9. Notes and caveats

- The `.git/` directory is **not** in the bundle (it contains the tracked root `.env` in history and is bulky); commit hashes, tags, and the full recent log are preserved in `00_manifest/GIT_STATE.txt`.
- `node_modules` is **not** in the bundle — restored exactly by `pnpm install` from the committed lockfile.
- micromamba tooling binaries were excluded from the bundle as third-party tooling (registered in `00_manifest/EXPORT_EXCLUSIONS.md`); re-fetch per §3 above.
- Media pipeline runtime defaults write to `/tmp/karen-media*` — override `MEDIA_TMP_DIR` / `MEDIA_STORAGE_DIR` for persistent storage.
- No migration, test, or report was regenerated to produce this bundle; it is a pure snapshot of the verified Gate 4 state (PARTIAL, proceed-capable).
