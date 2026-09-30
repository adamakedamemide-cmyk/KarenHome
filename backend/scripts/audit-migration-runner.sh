#!/usr/bin/env bash
# audit_migration_runner.sh — REAL-execution audit of apply-all-migrations-node.js
# Phases: A) fresh-DB full chain  B) idempotent re-run + inventory stability
#         C) failure transactionality (bogus step probe)  D) inventory parity vs live DB
set -u
PGBIN="${PG_BIN:-/home/z/my-project/scripts/pg-deb/pg-prefix/usr/lib/postgresql/17/bin}"
RUNNER="${RUNNER:-$(dirname "$0")/apply-all-migrations-node.js}"
DBDIR="$(cd "$(dirname "$0")/.." && pwd)/database"
AUDIT_DB=karen_g51_audit
LIVE_DB=karen_g51_fresh
export PATH="$PGBIN:$PATH"
RUN="NODE_PATH=/home/z/my-project/karenhome/backend/node_modules/.pnpm/pg@8.23.0/node_modules"

inv() { # object inventory hash of a DB (schema objects only, no data)
  psql -h 127.0.0.1 -p 5434 -U postgres -d "$1" -tAc "
    SELECT 'T|'||table_schema||'.'||table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT 'V|'||schemaname||'.'||viewname FROM pg_views WHERE schemaname NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT 'TR|'||trigger_schema||'.'||trigger_name||'@'||event_object_table FROM information_schema.triggers WHERE trigger_schema NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT 'FN|'||nsp.nspname||'.'||p.proname FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=p.pronamespace WHERE nsp.nspname NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT 'IX|'||schemaname||'.'||indexname FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT 'TY|'||nsp.nspname||'.'||t.typname FROM pg_type t JOIN pg_namespace nsp ON nsp.oid=t.typnamespace WHERE nsp.nspname NOT IN ('pg_catalog','information_schema')
    ORDER BY 1;" | sha256sum | cut -c1-16
}

echo "################ PHASE A: fresh DB full chain ################"
psql -h 127.0.0.1 -p 5434 -U postgres -qc "DROP DATABASE IF EXISTS $AUDIT_DB;" >/dev/null
psql -h 127.0.0.1 -p 5434 -U postgres -qc "CREATE DATABASE $AUDIT_DB;" >/dev/null
env $RUN DATABASE_URL="postgresql://postgres@127.0.0.1:5434/$AUDIT_DB" node "$RUNNER" 2>&1 | tail -4
echo "ledger rows: $(psql -h 127.0.0.1 -p 5434 -U postgres -d $AUDIT_DB -tAc 'SELECT COUNT(*) FROM platform.schema_migrations')"

echo "################ PHASE B: idempotent re-run ################"
H1=$(inv $AUDIT_DB)
env $RUN DATABASE_URL="postgresql://postgres@127.0.0.1:5434/$AUDIT_DB" node "$RUNNER" 2>&1 | grep -cE 'skipping' | xargs echo "skipped steps:"
env $RUN DATABASE_URL="postgresql://postgres@127.0.0.1:5434/$AUDIT_DB" node "$RUNNER" 2>&1 | grep -E 'applying|ERROR' | head -3; echo "(no 'applying' lines above = zero statements executed on re-run)"
H2=$(inv $AUDIT_DB)
echo "inventory hash before=$H1 after=$H2 $([ "$H1" = "$H2" ] && echo IDENTICAL || echo DRIFTED)"
LEDGER_STEPS=$(psql -h 127.0.0.1 -p 5434 -U postgres -d $AUDIT_DB -tAc "SELECT string_agg(step,',') FROM (SELECT step FROM platform.schema_migrations ORDER BY applied_at) s")
echo "ledger steps: ${LEDGER_STEPS:0:400}"

echo "################ PHASE C: failure transactionality probe ################"
mkdir -p "$DBDIR/audit_tmp"
cat > "$DBDIR/audit_tmp/bogus_migration.sql" << 'EOF'
-- audit probe: second statement is intentionally invalid
CREATE TABLE project.audit_bogus_probe (id uuid PRIMARY KEY);
THIS STATEMENT IS INTENTIONALLY INVALID;
EOF
sed 's#^];#  ["audit_bogus", "audit_tmp/bogus_migration.sql"],\n];#' "$RUNNER" > /home/z/my-project/scripts/audit_buggy_runner.js
env $RUN DATABASE_URL="postgresql://postgres@127.0.0.1:5434/$AUDIT_DB" node /home/z/my-project/scripts/audit_buggy_runner.js > /home/z/my-project/scripts/audit_buggy_out.log 2>&1
echo "buggy-runner exit=$? (expect 2)"
grep -E 'FAILED at step' /home/z/my-project/scripts/audit_buggy_out.log | head -1
echo "bogus table exists?  $(psql -h 127.0.0.1 -p 5434 -U postgres -d $AUDIT_DB -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='project' AND table_name='audit_bogus_probe'") (0 = no half-applied artifact)"
echo "ledger rows: $(psql -h 127.0.0.1 -p 5434 -U postgres -d $AUDIT_DB -tAc 'SELECT COUNT(*) FROM platform.schema_migrations') (18 = failure not recorded)"
H3=$(inv $AUDIT_DB)
echo "inventory hash after failure=$H3 $([ "$H2" = "$H3" ] && echo UNCHANGED || echo HALF_APPLIED)"

echo "################ PHASE D: inventory parity fresh-vs-live ################"
echo "fresh-audit=$H1"
echo "live-db   =$(inv $LIVE_DB)"

echo "################ CLEANUP ################"
rm -rf "$DBDIR/audit_tmp" /home/z/my-project/scripts/audit_buggy_runner.js
echo "audit complete"
