# Database adapter boundary

PostgreSQL schema is authoritative. ORM/table definitions belong here; domain/application layers must not import ORM-specific objects.

Implementation order: connection/pool -> transaction helper -> table mappings -> repositories -> outbox -> projections.
