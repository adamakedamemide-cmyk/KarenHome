-- Run after base schema + errata 0024/0025.
SELECT to_regclass('marketplace.listings') IS NOT NULL AS listings_present;
SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='listings' AND column_name='version') AS listing_version_present;
SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='credentials_one_authenticator') AS credential_authenticator_constraint_present;
SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_user_password_credential') AS unique_password_credential_present;
SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ix_outbox_unpublished') AS outbox_index_present;
SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='outbox_events' AND column_name='locked_by') AS outbox_claiming_present;
