# AirWise Pilot Execution Checklist

Last updated: 2026-04-14

## 1. Pilot prerequisites

### Customer and building intake

- signed pilot statement of work
- building roster with addresses, BBLs, BINs if available
- owner/operator contact matrix
- designated RDP / RCxA contacts if applicable
- list of target buildings for ventilation pilot

### Compliance intake

- existing ESPM exports where available
- utility bills or annual usage summaries
- prior engineering or audit reports
- affordable housing / Article 321 proof documents if relevant
- current filing status and any open DOB issues

### Monitoring/BAS intake

- BAS vendor name
- protocol and connection method
- point list export if available
- sensor vendor list
- occupied schedules
- written write-access approval policy

## 2. Phase-by-phase engineering checklist

### Phase 0

- create rules matrix
- load current official limit and pathway reference data
- define canonical building identity schema
- define ventilation system archetypes
- define write whitelist policy

### Phase 1

- import pilot portfolio
- resolve each building to pathway
- generate requirement rows
- upload and classify at least one real document per major type
- render portfolio dashboard
- render at least one Article 320 workspace
- render at least one Article 321 workspace

### Phase 2

- connect one live or replayed sensor stream
- run one BACnet discovery
- map points to canonical point types
- enable issue detector
- produce operator recommendations
- verify before/after comparison view

### Phase 3

- register whitelisted writable points
- test approval workflow
- execute one temporary schedule change in staging/pilot
- verify rollback
- verify audit logs

### Phase 4

- compile recommendation conversion rate
- summarize time-to-detect and time-to-action
- summarize compliance workflow completeness
- decide on next control/automation scope

## 3. Definition of done

The pilot is successful when:

- portfolio buildings are no longer managed in spreadsheets as the primary system of record
- the customer can see Article 320 and Article 321 readiness in one place
- at least one monitored ventilation system produces useful actions
- at least one operator-executed or supervised intervention has measurable before/after evidence
- all BAS writes remain controlled, approved, and reversible

## 4. Open risks to track weekly

- public-vs-owner pathway conflicts
- GFA data gaps
- ESPM sharing delays
- incomplete document sets
- missing BAS access
- unmappable points
- sensor quality problems
- operator adoption lag
- unsafe or unclear write requests

## 5. Pilot KPI set

### Compliance KPIs

- `% buildings mapped to pathway`
- `% buildings with blocker-free readiness view`
- `% requirements with evidence attached`
- `time to first building scorecard`

### Monitoring KPIs

- `systems connected`
- `points normalized`
- `issues detected per system`
- `recommendation acceptance rate`
- `time from issue to action`

### Control KPIs

- `approved commands`
- `successful rollbacks`
- `write attempts blocked by policy`

