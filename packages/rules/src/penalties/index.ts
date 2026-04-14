export function calculateLateReportPenalty(
  floorAreaSqFt: number,
  monthsLate: number
): number {
  return floorAreaSqFt * 0.5 * monthsLate;
}

export function calculateEmissionsPenalty(
  actualEmissionsTco2e: number,
  emissionsLimitTco2e: number
): number {
  return Math.max(0, actualEmissionsTco2e - emissionsLimitTco2e) * 268;
}
