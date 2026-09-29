# Full ERD — Enterprise Real Estate Platform v1

```mermaid
erDiagram
    platform_currencies {
        char(3) code PK
        text name
        text symbol
        smallint minor_unit
        boolean is_active
        timestamptz created_at
    }
    platform_exchange_rates {
        uuid id PK
        char(3) base_currency FK
        char(3) quote_currency FK
        numeric(20,10) rate
        timestamptz observed_at
        text source
        timestamptz created_at
    }
    platform_feature_flags {
        uuid id PK
        text key
        text description
        boolean enabled
        smallint rollout_percent
        jsonb config
        timestamptz created_at
        timestamptz updated_at
    }
    platform_settings {
        text key PK
        jsonb value
        text description
        timestamptz updated_at
    }
    platform_idempotency_keys {
        uuid id PK
        text scope
        text key
        text request_hash
        integer response_status
        jsonb response_body
        timestamptz expires_at
        timestamptz created_at
    }
    iam_users {
        uuid id PK
        platform.user_status status
        text first_name
        text last_name
        text display_name
        uuid avatar_media_id
        text locale
        text timezone
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
    iam_user_emails {
        uuid id PK
        uuid user_id FK
        citext email
        boolean is_primary
        boolean is_verified
        timestamptz verified_at
        timestamptz created_at
    }
    iam_user_phones {
        uuid id PK
        uuid user_id FK
        text phone_e164
        boolean is_primary
        boolean is_verified
        timestamptz verified_at
        timestamptz created_at
    }
    iam_credentials {
        uuid id PK
        uuid user_id FK
        text password_hash
        text passkey_credential_id
        text passkey_public_key
        timestamptz last_password_change_at
        timestamptz created_at
    }
    iam_user_sessions {
        uuid id PK
        uuid user_id FK
        text refresh_token_hash
        text device_id
        inet ip
        text user_agent
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }
    iam_roles {
        uuid id PK
        text code
        text name
        text description
        boolean is_system
        timestamptz created_at
    }
    iam_permissions {
        uuid id PK
        text code
        text description
        timestamptz created_at
    }
    iam_role_permissions {
        uuid role_id PK FK
        uuid permission_id PK FK
    }
    org_organizations {
        uuid id PK
        platform.organization_type type
        platform.organization_status status
        text legal_name
        text display_name
        text slug
        text tax_id
        citext email
        text phone_e164
        text website_url
        text description
        uuid logo_media_id
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
    org_organization_members {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        platform.membership_status status
        timestamptz joined_at
        timestamptz left_at
        uuid invited_by FK
        timestamptz created_at
    }
    org_member_roles {
        uuid member_id PK FK
        uuid role_id PK FK
    }
    org_agency_profiles {
        uuid organization_id PK FK
        text license_number
        smallint established_year
        text website_url
        jsonb specialties
        verification.verification_status verification_status
    }
    org_developer_profiles {
        uuid organization_id PK FK
        text developer_license_number
        smallint established_year
        verification.verification_status verification_status
    }
    geo_nodes {
        uuid id PK
        uuid parent_id FK
        text node_type
        text name
        text slug
        text path_text
        smallint level
        geography(Point,4326) centroid
        geometry(MultiPolygon,4326) boundary
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    geo_node_translations {
        uuid node_id PK FK
        text locale PK
        text name
    }
    property_property_types {
        uuid id PK
        uuid parent_id FK
        text code
        text name
        boolean is_residential
        boolean is_commercial
        boolean is_land
        boolean is_hospitality
        boolean is_active
        integer sort_order
    }
    property_amenities {
        uuid id PK
        text code
        text category
        text name
        text data_type
        boolean is_active
        integer sort_order
    }
    property_properties {
        uuid id PK
        bigint public_code
        uuid property_type_id FK
        property.property_status status
        property.ownership_type ownership_type
        numeric(14,2) area_total_m2
        numeric(14,2) area_usable_m2
        numeric(4,1) rooms
        smallint bedrooms
        smallint bathrooms
        smallint floor
        smallint total_floors
        smallint year_built
        jsonb attributes
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
    property_property_locations {
        uuid id PK
        uuid property_id FK
        uuid geo_node_id FK
        text address_line_1
        text address_line_2
        text postal_code
        geography(Point,4326) location_point
        property.visibility_level location_visibility
        text cadastral_number
        boolean is_primary
        timestamptz created_at
    }
    property_owners {
        uuid id PK
        uuid property_id FK
        uuid user_id FK
        uuid organization_id FK
        numeric(7,4) ownership_share
        boolean verified
        timestamptz verified_at
        timestamptz created_at
    }
    property_apartment_details {
        uuid property_id PK FK
        text condition_code
        text heating_type
        text furnishing_status
        numeric(6,2) ceiling_height_m
        numeric(10,2) balcony_area_m2
        text kitchen_type
        smallint parking_spaces
    }
    property_house_details {
        uuid property_id PK FK
        numeric(14,2) land_area_m2
        text condition_code
        text heating_type
        text furnishing_status
        smallint parking_spaces
        boolean pool
    }
    property_land_details {
        uuid property_id PK FK
        text land_category
        text zoning_code
        text development_rights
        boolean road_access
        numeric(12,2) road_frontage_m
        numeric(14,2) parcel_area_m2
        geometry(MultiPolygon,4326) parcel_geom
    }
    property_commercial_details {
        uuid property_id PK FK
        text commercial_category
        numeric(6,2) ceiling_height_m
        numeric(12,2) frontage_m
        smallint parking_spaces
        integer capacity
    }
    property_hospitality_details {
        uuid property_id PK FK
        text hospitality_type
        integer rooms_count
        integer beds_count
        numeric(2,1) star_rating
    }
    property_property_amenities {
        uuid property_id PK FK
        uuid amenity_id PK FK
        text value_text
        numeric(14,4) value_number
        boolean value_boolean
    }
    marketplace_media_assets {
        uuid id PK
        text storage_provider
        text bucket
        text object_key
        text mime_type
        bigint size_bytes
        integer width
        integer height
        char(64) sha256_hex
        text perceptual_hash
        jsonb metadata
        uuid created_by FK
        timestamptz created_at
    }
    marketplace_media_variants {
        uuid id PK
        uuid media_asset_id FK
        text object_key
        integer width
        integer height
        text format
        bigint size_bytes
    }
    property_property_media {
        uuid id PK
        uuid property_id FK
        uuid media_asset_id FK
        marketplace.media_type media_type
        integer sort_order
        boolean is_cover
        text caption
        timestamptz created_at
    }
    property_documents {
        uuid id PK
        uuid property_id FK
        uuid media_asset_id FK
        text document_type
        text document_number
        date issued_at
        date expires_at
        boolean is_public
        timestamptz created_at
    }
    marketplace_listings {
        uuid id PK
        bigint public_code
        uuid property_id FK
        uuid managing_organization_id FK
        uuid created_by_user_id FK
        marketplace.transaction_type transaction_type
        marketplace.listing_status status
        text title
        text description
        jsonb attributes
        char(3) currency_code FK
        numeric(20,4) price
        marketplace.price_period price_period
        numeric(20,4) service_fee
        timestamptz published_at
        timestamptz expires_at
        timestamptz last_refreshed_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }
    marketplace_listing_contact_settings {
        uuid listing_id PK FK
        boolean show_phone
        boolean show_email
        boolean allow_chat
        boolean allow_viewing_request
    }
    marketplace_listing_prices {
        uuid id PK
        uuid listing_id FK
        numeric(20,4) price
        char(3) currency_code FK
        marketplace.price_period price_period
        timestamptz valid_from
        timestamptz valid_to
        text change_reason
        tstzrange validity
        timestamptz created_at
    }
    marketplace_listing_media {
        uuid id PK
        uuid listing_id FK
        uuid media_asset_id FK
        marketplace.media_type media_type
        integer sort_order
        boolean is_cover
        text caption
        timestamptz created_at
    }
    marketplace_listing_status_history {
        uuid id PK
        uuid listing_id FK
        marketplace.listing_status from_status
        marketplace.listing_status to_status
        text reason
        uuid changed_by FK
        timestamptz created_at
    }
    marketplace_favorites {
        uuid user_id PK FK
        uuid listing_id PK FK
        timestamptz created_at
    }
    marketplace_saved_searches {
        uuid id PK
        uuid user_id FK
        text name
        jsonb query_json
        smallint query_schema_version
        char(64) query_hash
        integer frequency_minutes
        boolean enabled
        timestamptz last_evaluated_at
        timestamptz last_notified_at
        timestamptz created_at
        timestamptz updated_at
    }
    marketplace_saved_search_matches {
        uuid saved_search_id PK FK
        uuid listing_id PK FK
        timestamptz matched_at
        timestamptz notified_at
    }
    marketplace_listing_promotions {
        uuid id PK
        uuid listing_id FK
        marketplace.promotion_type promotion_type
        integer priority_score
        timestamptz started_at
        timestamptz ended_at
        uuid order_id
        timestamptz created_at
    }
    project_projects {
        uuid id PK
        bigint public_code
        uuid developer_organization_id FK
        text name
        text slug
        text description
        text status
        date start_date
        date completion_date
        uuid geo_node_id FK
        text address_text
        geography(Point,4326) location_point
        integer total_units
        timestamptz created_at
        timestamptz updated_at
    }
    project_project_buildings {
        uuid id PK
        uuid project_id FK
        text code
        text name
        smallint floors_count
    }
    project_project_floors {
        uuid id PK
        uuid building_id FK
        smallint floor_number
    }
    project_units {
        uuid id PK
        uuid project_id FK
        uuid building_id FK
        uuid floor_id FK
        uuid property_id FK
        text unit_number
        numeric(14,2) area_total_m2
        smallint bedrooms
        smallint bathrooms
        text orientation
        text view_description
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    project_unit_prices {
        uuid id PK
        uuid unit_id FK
        numeric(20,4) price
        char(3) currency_code FK
        timestamptz valid_from
        timestamptz valid_to
        tstzrange validity
        timestamptz created_at
    }
    project_payment_plans {
        uuid id PK
        uuid project_id FK
        text name
        char(3) currency_code FK
        numeric(7,4) down_payment_percent
        integer duration_months
        jsonb details
        boolean active
        timestamptz created_at
    }
    crm_leads {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        uuid listing_id FK
        uuid assigned_agent_id FK
        text source
        crm.lead_status status
        numeric(6,2) score
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
    crm_lead_activities {
        uuid id PK
        uuid lead_id FK
        crm.activity_type activity_type
        uuid performed_by FK
        text subject
        text body
        jsonb metadata
        timestamptz occurred_at
    }
    crm_tasks {
        uuid id PK
        uuid organization_id FK
        uuid assignee_user_id FK
        uuid lead_id FK
        text title
        text description
        text status
        smallint priority
        timestamptz due_at
        timestamptz completed_at
        timestamptz created_at
    }
    crm_viewings {
        uuid id PK
        uuid listing_id FK
        uuid lead_id FK
        uuid agent_user_id FK
        timestamptz scheduled_start
        timestamptz scheduled_end
        crm.viewing_status status
        text notes
        timestamptz created_at
    }
    messaging_conversations {
        uuid id PK
        messaging.conversation_type type
        uuid listing_id FK
        uuid organization_id FK
        timestamptz created_at
    }
    messaging_conversation_members {
        uuid conversation_id PK FK
        uuid user_id PK FK
        timestamptz joined_at
        timestamptz last_read_at
    }
    messaging_messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_user_id FK
        messaging.message_type message_type
        text body
        jsonb metadata
        timestamptz created_at
        timestamptz edited_at
        timestamptz deleted_at
    }
    messaging_message_media {
        uuid message_id PK FK
        uuid media_asset_id PK FK
    }
    billing_products {
        uuid id PK
        text code
        text name
        text product_type
        boolean active
        jsonb metadata
        timestamptz created_at
    }
    billing_product_prices {
        uuid id PK
        uuid product_id FK
        numeric(20,4) amount
        char(3) currency_code FK
        text billing_interval
        integer interval_count
        boolean active
        timestamptz created_at
    }
    billing_orders {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        char(3) currency_code FK
        numeric(20,4) subtotal
        numeric(20,4) tax
        numeric(20,4) discount
        numeric(20,4) total
        billing.order_status status
        timestamptz created_at
        timestamptz updated_at
    }
    billing_order_items {
        uuid id PK
        uuid order_id FK
        uuid product_price_id FK
        text description
        integer quantity
        numeric(20,4) unit_amount
        numeric(20,4) line_total
        jsonb metadata
    }
    billing_payments {
        uuid id PK
        uuid order_id FK
        text provider
        text provider_reference
        numeric(20,4) amount
        char(3) currency_code FK
        billing.payment_status status
        uuid idempotency_key FK
        jsonb raw_response
        timestamptz created_at
        timestamptz paid_at
    }
    billing_refunds {
        uuid id PK
        uuid payment_id FK
        text provider_reference
        numeric(20,4) amount
        text reason
        billing.refund_status status
        timestamptz created_at
        timestamptz completed_at
    }
    billing_invoices {
        uuid id PK
        uuid order_id FK
        text invoice_number
        text status
        timestamptz issued_at
        timestamptz due_at
        timestamptz paid_at
    }
    billing_subscriptions {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        uuid product_price_id FK
        billing.subscription_status status
        timestamptz started_at
        timestamptz current_period_start
        timestamptz current_period_end
        boolean auto_renew
        timestamptz cancelled_at
    }
    billing_ledger_accounts {
        uuid id PK
        text owner_type
        uuid owner_id
        char(3) currency_code FK
        billing.ledger_account_type account_type
        text status
        timestamptz created_at
    }
    billing_ledger_transactions {
        uuid id PK
        text reference_type
        uuid reference_id
        char(3) currency_code FK
        text description
        timestamptz created_at
    }
    billing_ledger_entries {
        uuid id PK
        uuid transaction_id FK
        uuid account_id FK
        billing.ledger_entry_side side
        numeric(20,4) amount
        timestamptz created_at
    }
    verification_cases {
        uuid id PK
        verification.case_type case_type
        uuid subject_user_id FK
        uuid subject_organization_id FK
        uuid subject_property_id FK
        verification.verification_status status
        text provider
        text provider_reference
        jsonb result
        timestamptz started_at
        timestamptz completed_at
        timestamptz expires_at
        timestamptz created_at
    }
    verification_documents {
        uuid id PK
        uuid case_id FK
        uuid media_asset_id FK
        text document_type
        text document_number
        verification.verification_status status
        date issued_at
        date expires_at
        jsonb extracted_data
        timestamptz created_at
    }
    moderation_reports {
        uuid id PK
        uuid reporter_user_id FK
        text target_type
        uuid target_id
        text reason_code
        text description
        moderation.report_status status
        timestamptz created_at
        timestamptz resolved_at
        uuid resolved_by FK
    }
    moderation_cases {
        uuid id PK
        text target_type
        uuid target_id
        text reason_code
        numeric(6,2) risk_score
        jsonb risk_signals
        moderation.case_status status
        smallint priority
        uuid assigned_to FK
        timestamptz created_at
        timestamptz resolved_at
        text resolution
    }
    moderation_actions {
        uuid id PK
        uuid case_id FK
        text action_code
        uuid actor_user_id FK
        text reason
        jsonb metadata
        timestamptz created_at
    }
    content_seo_pages {
        uuid id PK
        text path
        text page_type
        text entity_type
        uuid entity_id
        text locale
        text title
        text meta_description
        text canonical_url
        boolean indexable
        jsonb structured_data
        timestamptz last_generated_at
        timestamptz created_at
        timestamptz updated_at
    }
    content_seo_redirects {
        uuid id PK
        text from_path
        text to_path
        smallint status_code
        timestamptz created_at
    }
    content_cms_pages {
        uuid id PK
        text slug
        text locale
        content.publish_status status
        text title
        timestamptz created_at
        timestamptz updated_at
        timestamptz published_at
    }
    content_cms_blocks {
        uuid id PK
        uuid page_id FK
        text block_type
        integer sort_order
        jsonb content
        timestamptz created_at
    }
    legal_contract_templates {
        uuid id PK
        text code
        text name
        text locale
        integer version
        text content_template
        boolean active
        timestamptz created_at
    }
    legal_contracts {
        uuid id PK
        uuid template_id FK
        legal.contract_status status
        text title
        text locale
        integer current_version
        timestamptz effective_at
        timestamptz expires_at
        timestamptz terminated_at
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    legal_contract_parties {
        uuid id PK
        uuid contract_id FK
        text role
        uuid user_id FK
        uuid organization_id FK
        text display_name_snapshot
        jsonb contact_snapshot
    }
    legal_contract_properties {
        uuid contract_id PK FK
        uuid property_id PK FK
    }
    legal_contract_versions {
        uuid id PK
        uuid contract_id FK
        integer version
        uuid document_media_id FK
        text rendered_content
        char(64) content_hash
        uuid created_by FK
        timestamptz created_at
    }
    legal_contract_signatures {
        uuid id PK
        uuid contract_version_id FK
        uuid contract_party_id FK
        uuid contract_id FK
        legal.signature_status status
        text signature_type
        text provider
        text provider_reference
        timestamptz signed_at
        timestamptz created_at
    }
    rental_leases {
        uuid id PK
        uuid property_id FK
        uuid source_listing_id FK
        uuid contract_id FK
        uuid landlord_user_id FK
        uuid landlord_organization_id FK
        uuid tenant_user_id FK
        uuid tenant_organization_id FK
        rental.lease_status status
        char(3) currency_code FK
        numeric(20,4) monthly_rent
        numeric(20,4) deposit_amount
        date start_date
        date end_date
        boolean auto_renew
        timestamptz created_at
        timestamptz updated_at
    }
    rental_lease_parties {
        uuid id PK
        uuid lease_id FK
        text role
        uuid user_id FK
        uuid organization_id FK
        text name_snapshot
        jsonb contact_snapshot
    }
    rental_rent_schedules {
        uuid id PK
        uuid lease_id FK
        date due_date
        numeric(20,4) amount
        char(3) currency_code FK
        rental.rent_payment_status status
        timestamptz paid_at
    }
    rental_rent_payments {
        uuid id PK
        uuid schedule_id FK
        numeric(20,4) amount
        char(3) currency_code FK
        uuid external_payment_id FK
        timestamptz paid_at
        timestamptz created_at
    }
    rental_maintenance_tickets {
        uuid id PK
        uuid property_id FK
        uuid lease_id FK
        uuid created_by FK
        uuid assigned_to FK
        text title
        text description
        smallint priority
        rental.maintenance_status status
        numeric(20,4) estimated_cost
        numeric(20,4) actual_cost
        char(3) currency_code FK
        timestamptz created_at
        timestamptz completed_at
    }
    valuation_cases {
        uuid id PK
        uuid property_id FK
        uuid requested_by_user_id FK
        valuation.valuation_status status
        text method
        text model_version
        timestamptz requested_at
        timestamptz completed_at
        timestamptz expires_at
    }
    valuation_results {
        uuid id PK
        uuid case_id FK
        numeric(20,4) min_value
        numeric(20,4) estimated_value
        numeric(20,4) max_value
        char(3) currency_code FK
        numeric(6,2) confidence
        numeric(20,4) price_per_m2
        timestamptz generated_at
    }
    valuation_comparables {
        uuid valuation_result_id PK FK
        uuid comparable_property_id PK FK
        uuid comparable_listing_id FK
        numeric(6,2) similarity_score
        numeric(12,2) distance_m
        numeric(20,4) adjusted_price
    }
    notification_templates {
        uuid id PK
        text code
        text locale
        text channel
        text subject_template
        text body_template
        boolean active
    }
    notification_user_preferences {
        uuid user_id PK FK
        text notification_type PK
        text channel PK
        boolean enabled
    }
    notification_notifications {
        uuid id PK
        uuid user_id FK
        text template_code
        text notification_type
        text title
        text body
        jsonb data
        timestamptz read_at
        timestamptz created_at
    }
    notification_deliveries {
        uuid id PK
        uuid notification_id FK
        text channel
        text provider
        text provider_reference
        text status
        integer attempts
        text last_error
        timestamptz sent_at
        timestamptz delivered_at
        timestamptz created_at
    }
    review_reviews {
        uuid id PK
        uuid reviewer_user_id FK
        text target_type
        uuid target_id
        uuid listing_id FK
        smallint rating
        text title
        text body
        review.review_status status
        timestamptz created_at
        timestamptz updated_at
    }
    audit_logs {
        uuid id PK
        uuid actor_user_id FK
        uuid organization_id FK
        text action
        text entity_type
        uuid entity_id
        jsonb before_data
        jsonb after_data
        inet ip
        text user_agent
        uuid request_id
        timestamptz created_at
    }
    audit_outbox_events {
        uuid id PK
        text aggregate_type
        uuid aggregate_id
        text event_type
        jsonb payload
        timestamptz occurred_at
        timestamptz published_at
        integer retry_count
        text last_error
    }
    platform_exchange_rates }o--|| platform_currencies : references
    platform_exchange_rates }o--|| platform_currencies : references
    iam_user_emails }o--|| iam_users : references
    iam_user_phones }o--|| iam_users : references
    iam_credentials }o--|| iam_users : references
    iam_user_sessions }o--|| iam_users : references
    iam_role_permissions }o--|| iam_roles : references
    iam_role_permissions }o--|| iam_permissions : references
    org_organization_members }o--|| org_organizations : references
    org_organization_members }o--|| iam_users : references
    org_organization_members }o--|| iam_users : references
    org_member_roles }o--|| org_organization_members : references
    org_member_roles }o--|| iam_roles : references
    org_agency_profiles }o--|| org_organizations : references
    org_developer_profiles }o--|| org_organizations : references
    geo_nodes }o--|| geo_nodes : references
    geo_node_translations }o--|| geo_nodes : references
    property_property_types }o--|| property_property_types : references
    property_properties }o--|| property_property_types : references
    property_properties }o--|| iam_users : references
    property_property_locations }o--|| property_properties : references
    property_property_locations }o--|| geo_nodes : references
    property_owners }o--|| property_properties : references
    property_owners }o--|| iam_users : references
    property_owners }o--|| org_organizations : references
    property_apartment_details }o--|| property_properties : references
    property_house_details }o--|| property_properties : references
    property_land_details }o--|| property_properties : references
    property_commercial_details }o--|| property_properties : references
    property_hospitality_details }o--|| property_properties : references
    property_property_amenities }o--|| property_properties : references
    property_property_amenities }o--|| property_amenities : references
    marketplace_media_assets }o--|| iam_users : references
    marketplace_media_variants }o--|| marketplace_media_assets : references
    property_property_media }o--|| property_properties : references
    property_property_media }o--|| marketplace_media_assets : references
    property_documents }o--|| property_properties : references
    property_documents }o--|| marketplace_media_assets : references
    marketplace_listings }o--|| property_properties : references
    marketplace_listings }o--|| org_organizations : references
    marketplace_listings }o--|| iam_users : references
    marketplace_listings }o--|| platform_currencies : references
    marketplace_listing_contact_settings }o--|| marketplace_listings : references
    marketplace_listing_prices }o--|| marketplace_listings : references
    marketplace_listing_prices }o--|| platform_currencies : references
    marketplace_listing_media }o--|| marketplace_listings : references
    marketplace_listing_media }o--|| marketplace_media_assets : references
    marketplace_listing_status_history }o--|| marketplace_listings : references
    marketplace_listing_status_history }o--|| iam_users : references
    marketplace_favorites }o--|| iam_users : references
    marketplace_favorites }o--|| marketplace_listings : references
    marketplace_saved_searches }o--|| iam_users : references
    marketplace_saved_search_matches }o--|| marketplace_saved_searches : references
    marketplace_saved_search_matches }o--|| marketplace_listings : references
    marketplace_listing_promotions }o--|| marketplace_listings : references
    project_projects }o--|| org_organizations : references
    project_projects }o--|| geo_nodes : references
    project_project_buildings }o--|| project_projects : references
    project_project_floors }o--|| project_project_buildings : references
    project_units }o--|| project_projects : references
    project_units }o--|| project_project_buildings : references
    project_units }o--|| project_project_floors : references
    project_units }o--|| property_properties : references
    project_unit_prices }o--|| project_units : references
    project_unit_prices }o--|| platform_currencies : references
    project_payment_plans }o--|| project_projects : references
    project_payment_plans }o--|| platform_currencies : references
    crm_leads }o--|| iam_users : references
    crm_leads }o--|| org_organizations : references
    crm_leads }o--|| marketplace_listings : references
    crm_leads }o--|| iam_users : references
    crm_lead_activities }o--|| crm_leads : references
    crm_lead_activities }o--|| iam_users : references
    crm_tasks }o--|| org_organizations : references
    crm_tasks }o--|| iam_users : references
    crm_tasks }o--|| crm_leads : references
    crm_viewings }o--|| marketplace_listings : references
    crm_viewings }o--|| crm_leads : references
    crm_viewings }o--|| iam_users : references
    messaging_conversations }o--|| marketplace_listings : references
    messaging_conversations }o--|| org_organizations : references
    messaging_conversation_members }o--|| messaging_conversations : references
    messaging_conversation_members }o--|| iam_users : references
    messaging_messages }o--|| messaging_conversations : references
    messaging_messages }o--|| iam_users : references
    messaging_message_media }o--|| messaging_messages : references
    messaging_message_media }o--|| marketplace_media_assets : references
    billing_product_prices }o--|| billing_products : references
    billing_product_prices }o--|| platform_currencies : references
    billing_orders }o--|| iam_users : references
    billing_orders }o--|| org_organizations : references
    billing_orders }o--|| platform_currencies : references
    billing_order_items }o--|| billing_orders : references
    billing_order_items }o--|| billing_product_prices : references
    billing_payments }o--|| billing_orders : references
    billing_payments }o--|| platform_currencies : references
    billing_payments }o--|| platform_idempotency_keys : references
    billing_refunds }o--|| billing_payments : references
    billing_invoices }o--|| billing_orders : references
    billing_subscriptions }o--|| org_organizations : references
    billing_subscriptions }o--|| iam_users : references
    billing_subscriptions }o--|| billing_product_prices : references
    billing_ledger_accounts }o--|| platform_currencies : references
    billing_ledger_transactions }o--|| platform_currencies : references
    billing_ledger_entries }o--|| billing_ledger_transactions : references
    billing_ledger_entries }o--|| billing_ledger_accounts : references
    verification_cases }o--|| iam_users : references
    verification_cases }o--|| org_organizations : references
    verification_cases }o--|| property_properties : references
    verification_documents }o--|| verification_cases : references
    verification_documents }o--|| marketplace_media_assets : references
    moderation_reports }o--|| iam_users : references
    moderation_reports }o--|| iam_users : references
    moderation_cases }o--|| iam_users : references
    moderation_actions }o--|| moderation_cases : references
    moderation_actions }o--|| iam_users : references
    content_cms_blocks }o--|| content_cms_pages : references
    legal_contracts }o--|| legal_contract_templates : references
    legal_contracts }o--|| iam_users : references
    legal_contract_parties }o--|| legal_contracts : references
    legal_contract_parties }o--|| iam_users : references
    legal_contract_parties }o--|| org_organizations : references
    legal_contract_properties }o--|| legal_contracts : references
    legal_contract_properties }o--|| property_properties : references
    legal_contract_versions }o--|| legal_contracts : references
    legal_contract_versions }o--|| marketplace_media_assets : references
    legal_contract_versions }o--|| iam_users : references
    legal_contract_signatures }o--|| legal_contract_versions : references
    legal_contract_signatures }o--|| legal_contract_parties : references
    legal_contract_signatures }o--|| legal_contracts : references
    rental_leases }o--|| property_properties : references
    rental_leases }o--|| marketplace_listings : references
    rental_leases }o--|| legal_contracts : references
    rental_leases }o--|| iam_users : references
    rental_leases }o--|| org_organizations : references
    rental_leases }o--|| iam_users : references
    rental_leases }o--|| org_organizations : references
    rental_leases }o--|| platform_currencies : references
    rental_lease_parties }o--|| rental_leases : references
    rental_lease_parties }o--|| iam_users : references
    rental_lease_parties }o--|| org_organizations : references
    rental_rent_schedules }o--|| rental_leases : references
    rental_rent_schedules }o--|| platform_currencies : references
    rental_rent_payments }o--|| rental_rent_schedules : references
    rental_rent_payments }o--|| platform_currencies : references
    rental_rent_payments }o--|| billing_payments : references
    rental_maintenance_tickets }o--|| property_properties : references
    rental_maintenance_tickets }o--|| rental_leases : references
    rental_maintenance_tickets }o--|| iam_users : references
    rental_maintenance_tickets }o--|| iam_users : references
    rental_maintenance_tickets }o--|| platform_currencies : references
    valuation_cases }o--|| property_properties : references
    valuation_cases }o--|| iam_users : references
    valuation_results }o--|| valuation_cases : references
    valuation_results }o--|| platform_currencies : references
    valuation_comparables }o--|| valuation_results : references
    valuation_comparables }o--|| property_properties : references
    valuation_comparables }o--|| marketplace_listings : references
    notification_user_preferences }o--|| iam_users : references
    notification_notifications }o--|| iam_users : references
    notification_deliveries }o--|| notification_notifications : references
    review_reviews }o--|| iam_users : references
    review_reviews }o--|| marketplace_listings : references
    audit_logs }o--|| iam_users : references
    audit_logs }o--|| org_organizations : references
```

Entities: 99
Foreign-key relationships: {len(rels)}
