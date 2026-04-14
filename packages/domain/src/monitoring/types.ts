export type MonitoringPointType =
  | "fan_command"
  | "fan_status"
  | "occupancy_mode"
  | "schedule"
  | "co2"
  | "temperature"
  | "humidity"
  | "damper_position"
  | "airflow_proxy"
  | "alarm"
  | "manual_override";

export type MonitoringIssueType =
  | "after_hours_runtime"
  | "schedule_mismatch"
  | "high_co2_low_ventilation"
  | "low_occupancy_high_runtime"
  | "stale_override"
  | "sensor_fault";

export type MonitoringIssue = {
  id: string;
  buildingId: string;
  systemId?: string;
  issueType: MonitoringIssueType;
  summary: string;
  evidenceWindow: string;
  recommendedAction?: string;
  writebackEligible: boolean;
  confidenceScore: number;
  status?: "open" | "in_progress" | "resolved";
  assignedTo?: string;
};

export type RecommendationActionStatus = "proposed" | "in_progress" | "completed" | "cancelled";

export type BeforeAfterSummary = {
  metricLabel: string;
  baselineValue?: number;
  comparisonValue?: number;
  delta?: number;
  baselineSampleCount: number;
  comparisonSampleCount: number;
};

export type RecommendationAction = {
  id: string;
  recommendationId: string;
  buildingId: string;
  actionType: string;
  actionStatus: RecommendationActionStatus;
  assignee?: string;
  notes?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  beforeAfter?: BeforeAfterSummary;
};
