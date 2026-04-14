import type { MonitoringPointType } from "@airwise/domain";

export const writablePointTypes: MonitoringPointType[] = [
  "schedule",
  "occupancy_mode"
];

export const canonicalPointTypes: MonitoringPointType[] = [
  "fan_command",
  "fan_status",
  "occupancy_mode",
  "schedule",
  "co2",
  "temperature",
  "humidity",
  "damper_position",
  "airflow_proxy",
  "alarm",
  "manual_override"
];
