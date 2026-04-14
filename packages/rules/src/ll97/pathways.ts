import type { CompliancePathway } from "@airwise/domain";

export const pathwayMetadata: Record<
  Exclude<CompliancePathway, "UNKNOWN">,
  { article: "320" | "321"; label: string; summary: string }
> = {
  CP0: {
    article: "320",
    label: "Article 320 beginning 2024",
    summary: "General covered-building annual emissions reporting."
  },
  CP1: {
    article: "320",
    label: "Article 320 beginning 2026",
    summary: "Delayed start for certain rent-regulated properties."
  },
  CP2: {
    article: "320",
    label: "Article 320 beginning 2035",
    summary: "Delayed start for certain income-restricted properties."
  },
  CP3: {
    article: "321",
    label: "Article 321",
    summary: "Affordable housing pathway with performance or PECM options."
  },
  CP4: {
    article: "320",
    label: "City / NYCHA class",
    summary: "Special-class buildings with separate handling."
  }
};
