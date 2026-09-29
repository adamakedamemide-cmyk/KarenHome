# Change Control

After Backend Contract v1.0 is frozen:

- Breaking API changes require a new major API version or explicit compatibility plan.
- New additive fields are preferred over renaming/removing fields.
- Database changes ship as immutable migrations.
- Events require versioned payloads; consumers must accept old versions during rollout.
- Permission additions are additive; permission removals require a migration + rollout plan.
- Search document changes must be backward compatible or use a versioned index alias.
