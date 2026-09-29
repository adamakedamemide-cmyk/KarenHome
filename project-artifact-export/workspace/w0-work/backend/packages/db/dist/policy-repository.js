"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiBotRepository = exports.PublicationPolicyRepository = void 0;
/**
 * Publication Policy inputs (mandate §6). One bounded round-trip per listing;
 * the policy decision itself is pure and unit-tested in the application layer.
 */
class PublicationPolicyRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /** Payment-or-contract evidence for reserved/under_contract/sold/rented transitions (§5). */
    async hasActiveLeaseForListing(listingId) {
        const r = await this.db.query(`SELECT EXISTS (SELECT 1 FROM rental.leases WHERE source_listing_id = $1::uuid AND status IN ('active','pending_signature')) AS exists`, [listingId]);
        return r.rows[0]?.exists ?? false;
    }
    async collect(listingId, opts) {
        const r = await this.db.query(`WITH l AS (SELECT * FROM marketplace.listings WHERE id = $1::uuid),
         v AS (
           SELECT
             CASE WHEN $3::boolean THEN EXISTS (
               SELECT 1 FROM verification.cases vc
               WHERE vc.subject_user_id = (SELECT created_by_user_id FROM l)
                 AND vc.status = 'verified' AND vc.case_type IN ('identity','agent','organization')
             ) ELSE true END AS seller_verified,
             EXISTS (
               SELECT 1 FROM legal.user_agreement_acceptances a
               WHERE a.user_id = (SELECT created_by_user_id FROM l)
                 AND a.agreement_code = $2 AND a.agreement_version >= $4
             ) AS agreement_accepted,
             (SELECT count(*) FROM moderation.cases mc
               WHERE mc.target_type = 'listing' AND mc.target_id = $1::uuid
                 AND mc.status IN ('open','in_review') AND mc.reason_code IN ('fraud','scam','impersonation'))::text AS open_fraud,
             (SELECT count(*) FROM moderation.cases mc
               WHERE mc.target_type = 'listing' AND mc.target_id = $1::uuid
                 AND mc.status IN ('open','in_review'))::text AS open_moderation,
             (SELECT p.status::text FROM property.properties p WHERE p.id = (SELECT property_id FROM l)) AS property_status,
             EXISTS (
               SELECT 1 FROM property.property_locations pl
               WHERE pl.property_id = (SELECT property_id FROM l) AND pl.is_primary = true
                 AND pl.geo_node_id IS NOT NULL
             ) AS has_location,
             EXISTS (
               SELECT 1 FROM marketplace.listing_prices lp
               WHERE lp.listing_id = $1::uuid AND lp.valid_from <= now()
                 AND (lp.valid_to IS NULL OR lp.valid_to > now())
             ) AS has_price,
             (SELECT count(*) FROM marketplace.listing_media lm
               WHERE lm.listing_id = $1::uuid AND lm.media_type = 'photo')::text AS photo_count,
             (SELECT count(*) FROM marketplace.listing_media lm
               WHERE lm.listing_id = $1::uuid AND lm.is_cover = true)::text AS cover_count,
             (SELECT length(title) FROM l) AS title_length,
             (SELECT length(description) FROM l) AS description_length
         )
       SELECT * FROM v`, [listingId, opts.agreementCode, opts.requireSellerVerification, opts.agreementVersion]);
        const row = r.rows[0];
        if (!row)
            throw new Error('LISTING_NOT_FOUND');
        return {
            sellerVerified: row.seller_verified,
            agreementAccepted: row.agreement_accepted,
            openModerationCases: Number(row.open_moderation ?? '0'),
            openFraudCases: Number(row.open_fraud ?? '0'),
            propertyStatus: row.property_status,
            propertyHasPrimaryLocation: row.has_location,
            hasCurrentPrice: row.has_price,
            photoCount: Number(row.photo_count ?? '0'),
            coverCount: Number(row.cover_count ?? '0'),
            titleLength: row.title_length ?? 0,
            descriptionLength: row.description_length ?? 0,
        };
    }
}
exports.PublicationPolicyRepository = PublicationPolicyRepository;
/** Anti-bot block check used by auth-sensitive endpoints (§16). */
class AntiBotRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async isBlocked(subjectType, subjectKey) {
        const r = await this.db.query(`SELECT platform.is_blocked($1, $2) AS blocked`, [subjectType, subjectKey]);
        return r.rows[0]?.blocked ?? false;
    }
    async recordRiskEvent(input, executor = this.db) {
        await executor.query(`INSERT INTO platform.risk_events(subject_type, subject_key, signal, score, metadata)
       VALUES ($1, $2, $3, $4::numeric, $5::jsonb)`, [input.subjectType, input.subjectKey, input.signal, input.score, JSON.stringify(input.metadata ?? {})]);
    }
    async createBlock(input, executor = this.db) {
        await executor.query(`INSERT INTO platform.blocks(subject_type, subject_key, reason, blocked_by, expires_at)
       VALUES ($1, $2, $3, $4, $5::timestamptz)`, [input.subjectType, input.subjectKey, input.reason, input.blockedBy ?? 'anti_bot', input.expiresAt]);
    }
    async countRecentIpFailures(ip, windowSeconds) {
        const r = await this.db.query(`SELECT count(*)::text AS count FROM iam.login_attempts
       WHERE ip = $1::inet AND success = false AND created_at > now() - make_interval(secs => $2)`, [ip, windowSeconds]);
        return Number(r.rows[0]?.count ?? '0');
    }
    async countRecentEmailFailures(email, windowSeconds) {
        const r = await this.db.query(`SELECT count(*)::text AS count FROM iam.login_attempts
       WHERE email_tried = $1::citext AND success = false AND created_at > now() - make_interval(secs => $2)`, [email, windowSeconds]);
        return Number(r.rows[0]?.count ?? '0');
    }
    async countRecentImpressionBurst(sessionHash, windowSeconds, executor = this.db) {
        const r = await executor.query(`SELECT count(*)::text AS count FROM advertising.impressions
       WHERE session_hash = $1 AND served_at > now() - make_interval(secs => $2)`, [sessionHash, windowSeconds]);
        return Number(r.rows[0]?.count ?? '0');
    }
}
exports.AntiBotRepository = AntiBotRepository;
