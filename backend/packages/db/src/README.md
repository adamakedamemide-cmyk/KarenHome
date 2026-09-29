# @platform/db

Production adapter boundary for PostgreSQL. `PostgresDatabase` owns pooling and transactions; domain/application modules consume repository abstractions rather than `pg` directly.

IAM access is currently implemented in `IamRepository` against the frozen Database Contract v1.
