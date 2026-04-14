# AirWise Notion Operating System

Last updated: 2026-04-14

## Goal

Create a simple founder operating system in Notion that runs the first 90 days of AirWise across:

- product
- engineering
- pilot operations
- sales / GTM

This structure is intentionally lightweight. It should help two founders run execution without introducing heavy process.

## Workspace structure

Create one top-level page:

- `AirWise Operating System`

Under that page, create these databases:

1. `Weekly Priorities`
2. `Work Items`
3. `Pilot Buildings`
4. `Accounts & Stakeholders`
5. `Risks & Blockers`
6. `KPI Scoreboard`
7. `Decision Log`

## 1. Weekly Priorities database

Purpose:

- run the company week by week
- lock one product, one pilot, and one sales milestone every week

Recommended properties:

- `Week` — Title
- `Start Date` — Date
- `End Date` — Date
- `Theme` — Select
- `Primary Product Milestone` — Rich text
- `Primary Pilot Milestone` — Rich text
- `Primary Sales Milestone` — Rich text
- `Status` — Status (`Planned`, `In Progress`, `Done`, `Slipped`)
- `Owner` — People or text
- `Notes` — Rich text

Recommended views:

- `Current Week`
- `All Weeks`
- `Slipped Weeks`

## 2. Work Items database

Purpose:

- track actual execution tasks across product, engineering, pilot ops, and GTM

Recommended properties:

- `Task` — Title
- `Week` — Relation to `Weekly Priorities`
- `Function` — Select (`Product`, `Engineering`, `Pilot Ops`, `Sales`)
- `Area` — Select (`Compliance`, `Monitoring`, `Documents`, `Commands`, `Infra`, `Customer`, `GTM`)
- `Owner` — People or text
- `Status` — Status (`Not Started`, `In Progress`, `Blocked`, `Done`)
- `Priority` — Select (`P0`, `P1`, `P2`)
- `Due Date` — Date
- `Dependency` — Rich text
- `Building / Account` — Rich text
- `Definition of Done` — Rich text
- `Notes` — Rich text

Recommended views:

- `Board by Function`
- `Current Week Tasks`
- `Blocked`
- `By Owner`
- `Pilot-Critical`

## 3. Pilot Buildings database

Purpose:

- keep building truth, pathway state, document status, and monitoring readiness in one place

Recommended properties:

- `Building` — Title
- `Portfolio / Account` — Relation to `Accounts & Stakeholders`
- `Address` — Rich text
- `BBL` — Rich text
- `BIN` — Rich text
- `Article` — Select (`320`, `321`, `Unknown`)
- `Pathway` — Select (`CP0`, `CP1`, `CP2`, `CP3`, `CP4`, `Unknown`)
- `Readiness` — Status (`Unknown`, `Blocked`, `In Progress`, `Ready`)
- `Monitoring Scope` — Select (`None`, `Read Only`, `Recommendations`, `Supervised Control`)
- `Ventilation System Type` — Multi-select
- `BAS Access` — Status (`Not Requested`, `Requested`, `Granted`, `Blocked`)
- `Documents Complete` — Status (`No`, `Partial`, `Mostly`, `Yes`)
- `Primary Blocker` — Rich text
- `Next Action` — Rich text

Recommended views:

- `By Pathway`
- `Readiness Board`
- `Monitoring Pilot`
- `Blocked Buildings`

## 4. Accounts & Stakeholders database

Purpose:

- manage the pilot account, expansion path, and stakeholder map

Recommended properties:

- `Account / Contact` — Title
- `Type` — Select (`Account`, `Decision Maker`, `Operator`, `Engineer`, `RDP`, `Partner`)
- `Company` — Rich text
- `Role` — Rich text
- `Relationship Strength` — Select (`Strong`, `Warm`, `Cold`)
- `Stage` — Status (`Intro`, `Active`, `Pilot`, `Expansion`, `Dormant`)
- `Owner` — People or text
- `Next Meeting` — Date
- `Next Ask` — Rich text
- `Open Questions` — Rich text
- `Last Update` — Date

Recommended views:

- `Pilot Stakeholders`
- `Expansion Pipeline`
- `Needs Follow-Up`

## 5. Risks & Blockers database

Purpose:

- keep execution risk visible every week

Recommended properties:

- `Risk / Blocker` — Title
- `Category` — Select (`Compliance`, `Data`, `BAS`, `Pilot Ops`, `Sales`, `Safety`, `Infra`)
- `Severity` — Select (`High`, `Medium`, `Low`)
- `Owner` — People or text
- `Status` — Status (`Open`, `Monitoring`, `Resolved`)
- `Affected Building / Account` — Rich text
- `Mitigation` — Rich text
- `Deadline` — Date
- `Last Updated` — Date

Recommended views:

- `Open High Severity`
- `By Category`
- `Resolved`

## 6. KPI Scoreboard database

Purpose:

- review founder-level and company-level operating signals weekly

Recommended properties:

- `Metric` — Title
- `Function` — Select (`Product`, `Engineering`, `Pilot Ops`, `Sales`, `Shared`)
- `Target` — Number or text
- `Current` — Number or text
- `Week` — Relation to `Weekly Priorities`
- `Status` — Select (`On Track`, `At Risk`, `Off Track`)
- `Notes` — Rich text

Initial KPIs:

- `% buildings resolved to pathway`
- `% buildings with blocker-free readiness view`
- `% requested documents received`
- `systems connected`
- `issues detected`
- `recommendation acceptance rate`
- `pilot stakeholder response time`
- `number of demoable features shipped`

## 7. Decision Log database

Purpose:

- preserve important product, compliance, and pilot decisions

Recommended properties:

- `Decision` — Title
- `Date` — Date
- `Category` — Select (`Product`, `Compliance`, `Monitoring`, `Safety`, `GTM`)
- `Decision Maker` — People or text
- `Context` — Rich text
- `Decision Outcome` — Rich text
- `Impact` — Rich text
- `Follow-Up` — Rich text

## Suggested weekly operating rhythm

### Monday

- update `Weekly Priorities`
- set current week milestones
- review blockers and dependencies

### Wednesday

- review `Pilot Buildings`
- confirm BAS/doc/access progress
- update `Blocked` tasks

### Friday

- update `KPI Scoreboard`
- review `Risks & Blockers`
- log major product or pilot decisions
- close or slip weekly priorities

## Recommended first entries

### Weekly Priorities

Create 16 rows for Week 1 through Week 16 using the founder execution sheet.

### Work Items

Seed initial P0 tasks:

- set up repo and environments
- create schema v1
- import pilot roster
- implement pathway resolver
- create compliance workspace
- build document upload flow
- integrate first telemetry stream
- run BACnet discovery

### Risks & Blockers

Seed known risks:

- pathway conflicts between public and owner data
- incomplete GFA / ESPM inputs
- BAS access delays
- unclear command approval chain
- sensor quality issues

## Notion setup shortcut

If you want the fastest usable setup:

- make `Weekly Priorities`, `Work Items`, and `Pilot Buildings` first
- add the other four databases after week 2

That gives you enough structure to operate immediately without building too much admin overhead.
