# GATE 5 — Phase N: Projects Audit

Status: **NOT_IMPLEMENTED** (application layer); schema-complete + SQL-verified.

## File-by-file reality
- Database: 7 `project.*` tables (developers, projects, buildings, floors, units, unit_availability, project_translations — 0029 i18n).
- Application layer (repository/service/command/query/API/events/workers/authz/tests): none (grep-verified).

## Mandated flow (Phase N)
Developer → Project → Building → Floor → Unit → Availability → Listing — **NOT_EXECUTABLE in app layer**. Cross-project integrity: DB-level FK hierarchy + Gate 3 SQL invariants remain green (schema unchanged in Gate 5: migrations hash-verified in baseline; no new migration introduced any change to project.*). Re-running the SQL invariant chain happens at every fresh apply (15/15 in G5R-DB-001).
