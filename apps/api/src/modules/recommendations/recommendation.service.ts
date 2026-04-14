import {
  createRecommendationAction,
  getMonitoringWorkspaceByBuildingId,
  updateRecommendationActionStatus
} from "@airwise/database";

export function getRecommendations(buildingId: string) {
  return getMonitoringWorkspaceByBuildingId(buildingId);
}

export function createRecommendationActionRecord(input: {
  recommendationId: string;
  actionType: string;
  assignee?: string;
  notes?: string;
}) {
  return createRecommendationAction(input);
}

export function updateRecommendationActionRecord(input: {
  actionId: string;
  actionStatus: "proposed" | "in_progress" | "completed" | "cancelled";
  notes?: string;
}) {
  return updateRecommendationActionStatus(input);
}
