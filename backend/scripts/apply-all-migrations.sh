#!/usr/bin/env bash
# ============================================================================
# apply-all-migrations.sh — Karen Home Gate 3-DB migration runner
# Applies, in order, on a FRESH database:
#   1. base frozen schema (enterprise_real_estate_schema_frozen_v1.sql)
#   2. errata 0024 (provenance-tracked FIXED variant, W0-CF-02)
#   3. errata 0025, 0026
#   4. migrations 0027..0031 (Gate 3)
#   5. migrations 0032..0036 (Gate 4 + Gate 4.1)
#   6. seed_reference.sql
# Every file is recorded in platform.schema_migrations (idempotency ledger).
# ON_ERROR_STOP=1 → any error aborts with exit != 0 (0-ERROR requirement).
# ============================================================================
set -euo pipefail

DB_NAME="${1:?usage: apply-all-migrations.sh <database-name>}"
DB_DIR="$(cd "$(dirname "$0")/../database" && pwd)"
PSQL="psql -U postgres -v ON_ERROR_STOP=1 -q"

run_file() {
  local step="$1" file="$2"
  echo "── applying: $step"
  $PSQL -d "$DB_NAME" -f "$file"
  $PSQL -d "$DB_NAME" -c \
    "INSERT INTO platform.schema_migrations(step, filename, applied_at) VALUES ('$step', '$(basename "$file")', now())
     ON CONFLICT (step) DO NOTHING;" > /dev/null
}

echo "=== Karen Home — full migration chain on fresh DB: $DB_NAME ==="

# 0. ledger infrastructure (additive, documented in G3 report)
$PSQL -d "$DB_NAME" << 'SQL'
BEGIN;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE TABLE IF NOT EXISTS platform.schema_migrations (
    step text PRIMARY KEY,
    filename text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
SQL

run_file "base"        "$DB_DIR/base/enterprise_real_estate_schema_frozen_v1.sql"
run_file "errata_0024" "$DB_DIR/errata/0024_backend_critical_hardening_fixed.sql"
run_file "errata_0025" "$DB_DIR/errata/0025_additional_indexes.sql"
run_file "errata_0026" "$DB_DIR/errata/0026_outbox_claiming.sql"
run_file "0027_commission"       "$DB_DIR/migrations/0027_commission_domain.sql"
run_file "0028_advertising"      "$DB_DIR/migrations/0028_advertising_domain.sql"
run_file "0029_i18n"             "$DB_DIR/migrations/0029_i18n_translations.sql"
run_file "0030_iam_two_layer"    "$DB_DIR/migrations/0030_iam_personal_scope_authorization.sql"
run_file "0031_listing_state"    "$DB_DIR/migrations/0031_listing_state_reconciliation.sql"
run_file "0032_gate4_platform"   "$DB_DIR/migrations/0032_gate4_platform_infrastructure.sql"
run_file "0033_gate4_iam"        "$DB_DIR/migrations/0033_gate4_iam_hardening.sql"
run_file "0034_gate4_billing"    "$DB_DIR/migrations/0034_gate4_billing_plans.sql"
run_file "0035_gate41_ads_authz" "$DB_DIR/migrations/0035_gate41_advertising_authorization.sql"
run_file "0036_gate41_click_dedup" "$DB_DIR/migrations/0036_gate41_click_dedup.sql"
run_file "seed_reference"        "$DB_DIR/seed/seed_reference.sql"

echo "=== chain complete — verifying ledger ==="
$PSQL -d "$DB_NAME" -c "SELECT step, filename FROM platform.schema_migrations ORDER BY applied_at;"
echo "=== OK: 0 errors ==="
