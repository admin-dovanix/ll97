# AirWise Repo Skeleton

Last updated: 2026-04-14

## Goal

Provide a minimal but scalable repository structure for the first implementation of:

- shared building graph
- LL97 compliance engine
- monitoring and BACnet integration
- frontend product surfaces
- jobs and async workflows

## Proposed structure

```text
airwise/
  apps/
    web/
      src/
        app/
        components/
        features/
          auth/
          portfolios/
          buildings/
          compliance/
          documents/
          monitoring/
          recommendations/
          commands/
        lib/
        styles/
    api/
      src/
        modules/
          auth/
          portfolios/
          buildings/
          coverage/
          compliance/
          documents/
          monitoring/
          recommendations/
          commands/
          admin/
        routes/
        middleware/
        config/
        main.ts
    workers/
      src/
        jobs/
          building-import/
          coverage-refresh/
          requirement-generation/
          document-classification/
          telemetry-normalization/
          bacnet-discovery/
          issue-detection/
          command-expiry/
        lib/
        main.ts
  packages/
    database/
      schema/
      migrations/
      seeds/
    domain/
      src/
        building/
        compliance/
        monitoring/
        documents/
        recommendations/
        commands/
        shared/
    rules/
      src/
        ll97/
        article321/
        penalties/
        emissions-limits/
        point-taxonomy/
    ui/
      src/
    config/
      src/
  docs/
  infra/
    terraform/
    docker/
  scripts/
    import/
    verify/
    seed/
```

## Module responsibilities

### `apps/web`

- owner/asset manager UI
- building workspace
- portfolio dashboard
- evidence management
- monitoring and recommendation views
- command approval UI

### `apps/api`

- public and internal HTTP API
- auth and RBAC
- request validation
- orchestration of domain services

### `apps/workers`

- scheduled and async jobs
- imports
- discovery
- rule evaluation
- command expiry/rollback

### `packages/database`

- canonical schema
- migrations
- seeds for rules/config/reference data

### `packages/domain`

- domain entities and services
- pure application logic where possible
- no framework-specific concerns

### `packages/rules`

- versioned rule/config tables and deterministic evaluators
- compliance pathway logic
- penalty calculations
- PECM metadata
- ventilation point taxonomy and detection thresholds

## Initial module build order

1. `database`
2. `domain/building`
3. `domain/compliance`
4. `api portfolios/buildings/coverage/compliance`
5. `web portfolios/buildings/compliance`
6. `workers requirement-generation/document-classification`
7. `domain/monitoring`
8. `api monitoring/recommendations/commands`
9. `workers bacnet-discovery/issue-detection/command-expiry`
10. `web monitoring/recommendations/commands`

## Suggested first routes

- `POST /api/portfolios`
- `POST /api/portfolios/:id/buildings/import`
- `GET /api/buildings/:id`
- `POST /api/buildings/:id/coverage/resolve`
- `POST /api/buildings/:id/compliance/requirements/generate`
- `GET /api/buildings/:id/compliance`
- `POST /api/buildings/:id/documents`
- `POST /api/telemetry/sensor`
- `POST /api/bas/discovery-runs`
- `GET /api/buildings/:id/monitoring/issues`
- `POST /api/commands`
- `POST /api/commands/:id/approve`

## Suggested first pages

- `/login`
- `/portfolios`
- `/portfolios/[id]`
- `/buildings/[id]/overview`
- `/buildings/[id]/compliance`
- `/buildings/[id]/documents`
- `/buildings/[id]/monitoring`
- `/buildings/[id]/recommendations`
- `/commands`

## Engineering conventions

- Use TypeScript across frontend, API, and workers.
- Keep deterministic rule logic out of UI code.
- Store all compliance and control calculations with source/version metadata.
- Gate any write-back code behind explicit feature flags and pilot authorization.
- Prefer append-only audit records for compliance and control actions.

## First migrations to create

- portfolios
- users
- portfolio_memberships
- buildings
- coverage_records
- property_use_breakdowns
- annual_energy_records
- compliance_requirements
- documents
- document_evidence_links
- pecm_statuses
- monitoring_assets
- bas_points
- telemetry_events
- recommendations
- control_commands
- audit_events

