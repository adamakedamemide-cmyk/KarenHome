# RECOVERY.md — Karen Home one-session recovery

Goal: from a wiped sandbox to a fully verified Gate 4 state in one session.

## 1. Toolchain (micromamba)

```bash
# micromamba binary is shipped in the archive: bin/micromamba
export MAMBA_ROOT_PREFIX=/home/z/micromamba
micromamba create -n karen -c conda-forge postgresql=16.10 postgis=3.5 redis pnpm nodejs=24 -y
export PATH=$MAMBA_ROOT_PREFIX/envs/karen/bin:$PATH
initdb -D $MAMBA_ROOT_PREFIX/envs/karen/pgdata   # if data dir is gone
pg_ctl -D $MAMBA_ROOT_PREFIX/envs/karen/pgdata -l /tmp/pg.log start
redis-server --daemonize yes
```

## 2. Code + artifacts

```bash
tar -xzf karen-home-gate4-final.tar.gz    # self-contained export (code + gate4 reports + evidence)
cd w0-work/backend
pnpm install                              # lockfile restores sharp/@fastify/*/nodemailer/ioredis
pnpm typecheck && pnpm lint && pnpm build # expected: 0 errors / 0 problems / success
```

## 3. Database (fresh, canonical)

```bash
createdb -h 127.0.0.1 -U postgres karen_g4_fresh
./scripts/apply-all-migrations.sh karen_g4_fresh        # 13/13 steps, 0 ERROR
psql -d karen_g4_fresh -f database/verify/g3-verification.sql   # expect 37/37 PASS
psql -d karen_g4_fresh -f database/verify/g4-verification.sql   # expect 22/22 PASS
node scripts/g4-concurrency.js "postgresql://postgres@127.0.0.1:5432/karen_g4_fresh"  # expect 5/5 PASS
```

## 4. Run

```bash
# API
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/karen_g4_fresh \
JWT_SECRET='<43+ chars>' PORT=3000 node apps/api/dist/main.js
# Worker
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/karen_g4_fresh \
JWT_SECRET='<43+ chars>' node apps/worker/dist/main.js
```

## 5. Verify integrity

```bash
sha256sum -c FILE_MANIFEST.sha256   # manifest shipped in download/gate4/
git log --oneline | head -3         # gate4-final commit; git tag gate4-final
```

## Reference SHAs (audit chain)

- Master Prompt: `bcdebe3ad069a754bafbc6ed6e464195596074787625549801c0fe025ca4d1b`
- Reference Bundle: `af3a60e5af59fc1f90fe9c5edfd9e5dddd8afe8faf4d0de49baf3c5c00b4982a`
- Gate 3 schema snapshot: `f79a3348…` (download/w0/gate3/)
- Gate 4 schema snapshot: `40bd5ee4ca9ff3e71c17389883c6c9bad7b0c35ba2b627a80740e2819299fe62`

## Known good env defaults (dev)

`.env.example` in the repo; tests use `karen_g4`/`karen_g4_fresh` DBs; media dirs default to `/tmp/karen-media*` (override MEDIA_TMP_DIR / MEDIA_STORAGE_DIR in production).
