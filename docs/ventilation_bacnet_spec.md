# AirWise Ventilation Monitoring and BACnet Specification

Last updated: 2026-04-15

## Goal

AirWise currently implements a BACnet-first, read-first, recommendation-first monitoring stack with narrowly supervised write-back for approved pilot cases.

## Current in-scope systems

- central exhaust
- make-up air units
- corridor or common-area AHUs
- garage ventilation
- mixed central systems

These map directly to the BAS profile and ventilation archetype model already present in the building record.

## Current product capabilities

### Discovery and point model

- register BACnet gateways
- import discovery snapshots
- store monitoring assets and BAS points
- map canonical point types
- flag writable and whitelisted points

### Runtime contract

Gateways can now:

- fetch runtime config
- send heartbeats
- publish discovery
- publish telemetry
- poll for pending dispatches
- acknowledge dispatch outcomes

### Monitoring workflow

- inspect gateway runtime health
- review telemetry events
- evaluate deterministic issues
- route issues into recommendations and action tracking

### Supervised control workflow

- create command requests
- require approval before execution
- dispatch through gateway runtime or loopback path
- store acknowledgement, failure, retry, expiry, and rollback-related state

## Current non-goals

- full autonomous closed-loop control
- protocol-general integration beyond the BACnet-first path
- unrestricted writes to critical sequences
- claiming monitoring value for buildings without BAS/runtime access
