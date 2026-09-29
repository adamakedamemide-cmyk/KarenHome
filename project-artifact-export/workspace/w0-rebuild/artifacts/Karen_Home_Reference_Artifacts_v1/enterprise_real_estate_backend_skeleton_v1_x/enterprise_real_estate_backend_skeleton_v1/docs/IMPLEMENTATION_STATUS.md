# Implementation status

This is a scaffold, not production business logic.

Included: NestJS/Fastify bootstrap, strict TypeScript, validation pipe, Swagger bootstrap, modular Properties/Listings/Search boundaries, repository abstraction, contracts package, DB adapter boundary.

Not included yet: real PostgreSQL repository, auth/authorization, transaction manager, outbox publisher, OpenSearch adapter, payment adapters, persistent media, full DTO catalog, integration/E2E tests.

The in-memory repository is a development-only placeholder and must never be enabled in production.
