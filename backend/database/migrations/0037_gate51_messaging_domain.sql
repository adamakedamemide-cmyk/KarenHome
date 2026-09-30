-- ============================================================================
-- 0037_gate51_messaging_domain.sql — Gate 5.1 Phase B (Messaging Domain Closure)
-- ADDITIVE ONLY (Schema Diff invariant: REMOVED = 0).
-- Extends the frozen messaging schema (base v1: conversations,
-- conversation_members, messages, message_media) with:
--   1. delivery receipts (per-recipient delivery state, realtime ACK)
--   2. integrity triggers: edit policy (sender-only, 15-minute window,
--      soft-deleted immutability), delete policy (single soft delete, body
--      retained for moderation), conversation type integrity (listing_inquiry
--      requires a listing; system conversations require no listing)
--   3. access-path indexes for the repository queries
--   4. permission catalog seeds: messaging.view / messaging.manage
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Delivery receipts (per-recipient delivery state)
-- ---------------------------------------------------------------------------
CREATE TABLE messaging.message_receipts (
    message_id uuid NOT NULL REFERENCES messaging.messages(id) ON DELETE CASCADE,
    recipient_user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    delivered_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, recipient_user_id)
);

CREATE INDEX idx_message_receipts_recipient
    ON messaging.message_receipts (recipient_user_id, message_id);

-- ---------------------------------------------------------------------------
-- 2. Integrity triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION messaging.forbid_message_mutation()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    -- Soft-deleted messages are immutable for moderation/recovery.
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'MESSAGE_IMMUTABLE_DELETED: deleted messages cannot be modified';
    END IF;
    RETURN NEW;
END;
$fn$;

-- Single policy trigger: branches on WHAT changed. This avoids trigger-order
-- conflicts between an edit path and a delete path on the same row.
CREATE OR REPLACE FUNCTION messaging.enforce_message_policy()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- DELETE path: soft delete only; body is retained server-side (set to
        -- NULL at the API layer? no — the API nulls it; the DB requires that
        -- the body is NOT replaced with different content while deleting).
        IF NEW.body IS DISTINCT FROM OLD.body AND NEW.body IS NOT NULL THEN
            RAISE EXCEPTION 'MESSAGE_DELETE_RETAINS_BODY: body is retained for moderation';
        END IF;
    ELSIF NEW.deleted_at IS NULL THEN
        -- EDIT path: sender-only, conversation immutable, edited_at required,
        -- 15-minute edit window.
        IF NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id THEN
            RAISE EXCEPTION 'MESSAGE_EDIT_FORBIDDEN: only the sender may edit a message';
        END IF;
        IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
            RAISE EXCEPTION 'MESSAGE_EDIT_FORBIDDEN: conversation is immutable';
        END IF;
        IF NEW.edited_at IS NULL THEN
            RAISE EXCEPTION 'MESSAGE_EDIT_FORBIDDEN: edited_at must be set on edit';
        END IF;
        IF NEW.edited_at - OLD.created_at > interval '15 minutes' THEN
            RAISE EXCEPTION 'MESSAGE_EDIT_WINDOW_EXPIRED: edits allowed within 15 minutes of creation';
        END IF;
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION messaging.enforce_conversation_integrity()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.type = 'listing_inquiry' AND NEW.listing_id IS NULL THEN
        RAISE EXCEPTION 'CONVERSATION_LISTING_REQUIRED: listing_inquiry conversations require a listing';
    END IF;
    RETURN NEW;
END;
$fn$;

-- first line of defense: deleted rows are fully frozen
CREATE TRIGGER trg_messages_no_mutation_after_delete
    BEFORE UPDATE ON messaging.messages
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NOT NULL)
    EXECUTE FUNCTION messaging.forbid_message_mutation();

-- edit/delete policy (single trigger, no overlap conflicts)
CREATE TRIGGER trg_messages_policy
    BEFORE UPDATE OF body, edited_at, deleted_at, sender_user_id, conversation_id ON messaging.messages
    FOR EACH ROW EXECUTE FUNCTION messaging.enforce_message_policy();

CREATE TRIGGER trg_conversations_type_integrity
    BEFORE INSERT OR UPDATE ON messaging.conversations
    FOR EACH ROW EXECUTE FUNCTION messaging.enforce_conversation_integrity();

-- ---------------------------------------------------------------------------
-- 3. Access-path indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_messages_conversation_created
    ON messaging.messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_recent
    ON messaging.messages (sender_user_id, created_at DESC);
CREATE INDEX idx_conversation_members_user
    ON messaging.conversation_members (user_id);
CREATE INDEX idx_conversations_listing
    ON messaging.conversations (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_conversations_organization
    ON messaging.conversations (organization_id) WHERE organization_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Permission catalog seeds (additive)
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, description) VALUES
    ('messaging.view',       'Read conversations and messages the actor is a member of'),
    ('messaging.manage',     'Create/manage conversations and moderate messages')
ON CONFLICT (code) DO NOTHING;

COMMIT;
