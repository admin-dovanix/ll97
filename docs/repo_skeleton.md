# AirWise Repo Skeleton

Last updated: 2026-04-15

## Purpose

Show the repo as it exists now.

## Current structure

```text
airwise/
  apps/
    web/
      src/
        app/
          login/
          portfolios/
          commands/
          imports/
          buildings/[id]/
            overview/
            filing/
            compliance/
            documents/
            monitoring/
            recommendations/
        components/
          buildings/
          commands/
          compliance/
          data/
          data-display/
          documents/
          layout/
          monitoring/
          recommendations/
          reporting/
          ui/
        lib/
    api/
      src/
        config/
        lib/
        modules/
          buildings/
          commands/
          compliance/
          documents/
          monitoring/
          portfolios/
          recommendations/
          reporting/
        routes/
        main.ts
    workers/
      src/
        jobs/
          bacnet-discovery/
          building-import/
          command-expiry/
          coverage-refresh/
          document-classification/
          gateway-command-dispatch/
          gateway-runtime-health/
          issue-detection/
          requirement-generation/
          telemetry-normalization/
        lib/
        main.ts
    gateway-agent/
      src/
        adapters/
        lib/
        main.ts
    gateway-bridge/
      src/
        backends/
        providers/
        lib/
        main.ts
  packages/
    config/
    database/
      migrations/
      seeds/
      src/
    domain/
      src/
        building/
        compliance/
        monitoring/
        reporting/
        shared/
    rules/
      src/
        article321/
        emissions-limits/
        ll97/
        penalties/
        point-taxonomy/
    ui/
      src/
  docs/
  scripts/
    import/
    seed/
    verify/
  infra/
    docker/
    terraform/
```

## Notes

- The repo no longer maps cleanly to a “future skeleton” document; it already includes substantial product code.
- `packages/database` is both schema ownership and a large share of the application logic.
- `filing` is now a distinct product area in the web app and data model, not just a future idea folded into compliance.
