# Authorization Matrix

## Principal classes
- Anonymous
- User
- PropertyOwner
- Agent
- AgencyManager
- DeveloperManager
- SupportAgent
- Moderator
- FinanceOperator
- Admin
- SuperAdmin

## Policy model
RBAC supplies coarse permissions. Resource ownership/organization membership is evaluated by policy guards.

| Resource | Anonymous | Owner | Agent | Agency Manager | Developer | Support | Moderator | Finance | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Public published listing read | R | R | R | R | R | R | R | R | R |
| Draft own listing | - | CRUD | CRUD scoped | CRUD scoped | CRUD scoped | - | - | - | override |
| Publish listing | - | C* | C* | C* | C* | - | approve | - | override |
| Moderate listing | - | - | - | - | - | - | CRUD | - | CRUD |
| Property ownership data | - | own only | scoped | scoped | own projects | support-safe | moderation-safe | - | controlled |
| Organization members | - | - | own team | CRUD | own team | read-safe | - | - | override |
| Payments | - | own orders | scoped | scoped | scoped | read-safe | - | CRUD finance | override |
| Refunds | - | request | request | request | request | - | - | CRUD finance | override |
| CRM leads | - | - | own leads | org-wide | project leads | read-safe | - | - | override |
| Verification cases | - | own subject | scoped | org subject | developer subject | read-safe | action | - | override |

`C*` = publish is still subject to platform validation and moderation rules.

## Mandatory policy checks
1. Authentication.
2. Permission.
3. Resource existence/visibility.
4. Organization scope if organization-owned.
5. Ownership or delegated authority.
6. State transition policy.
7. Verification/moderation constraints where required.
8. Financial privilege and idempotency for money movement.
