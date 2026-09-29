#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BASE="${1:-database/base/enterprise_real_estate_schema_frozen_v1.sql}"
[[ -f "$BASE" ]] || { echo "Schema file not found: $BASE" >&2; exit 1; }
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BASE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "database/errata/0024_backend_critical_hardening.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "database/errata/0025_additional_indexes.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "database/errata/0026_outbox_claiming.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "database/verify/critical-invariants.sql"
