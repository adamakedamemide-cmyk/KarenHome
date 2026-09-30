# ENVIRONMENT_VARIANCE — PostgreSQL / PostGIS

Registered per Gate 5.1 Governance directive (item 7).

## Variance

| Dimension | Official Baseline (prior Gates) | Current Environment | Disposition |
|-----------|--------------------------------|---------------------|-------------|
| PostgreSQL | 16.x | **17.11** (Debian `17.11-0+deb13u1`, verified via `pg_config --version` in sandbox) | **ENVIRONMENT_VARIANCE** |
| PostGIS | 3.5.x | **3.5.2** (per environment record; live server not running at registration time) | **ENVIRONMENT_VARIANCE** |

## Required action before GATE 5.1 PASS

At least **one real compatibility run** of the full migration set + integration suite on:

```text
PostgreSQL 16
PostGIS 3.5.x
```

## Sandbox availability check (2026-09-30)

- `psql` CLI: absent from PATH
- PostgreSQL 16 packages (`postgresql-16`): **NOT INSTALLED** (only PG 17.11 server build present)
- Docker: **ABSENT** → no PG16 container fallback possible
- `/usr/lib/postgresql/`: absent/empty of alternative versions

## Disposition

```text
POSTGRESQL_16_COMPATIBILITY_RUN = UNVERIFIED_EXTERNAL_ENVIRONMENT
```

Per governance ruling: this does **NOT** auto-block Gate 5.1, because the capability cannot be
provisioned inside the current sandbox. The PostgreSQL 16 / PostGIS 3.5.x compatibility run is
therefore **carried as a mandatory open item for Final Production Acceptance** and must be listed
in the Gate 5.1 final report under "Unverified / External", and in every FINAL STATUS block until
discharged.

## Additional environment notes (recovery preparation)

- PostgreSQL server process is **not running** between sessions (no postmaster process, no socket
  at `/var/run/postgresql/`). Test runs must start the local PG service on demand before
  integration suites (this matches prior Phase B/C evidence runs which were executed against a
  locally-started real PG).
- Migration files present through `0039_gate51_projects_domain.sql` (Phase D draft, untracked).
