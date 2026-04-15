"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "../ui/status-badge";
import { Button } from "../ui/button";

type Option = {
  value: string;
  label: string;
  href: string;
};

export function ContextBar({
  portfolioOptions,
  buildingOptions,
  currentPortfolioId,
  currentBuildingId,
  reportingYear,
  globalStatusLabel,
  globalStatusTone
}: {
  portfolioOptions: Option[];
  buildingOptions: Option[];
  currentPortfolioId?: string;
  currentBuildingId?: string;
  reportingYear: number;
  globalStatusLabel: string;
  globalStatusTone: "success" | "warning" | "danger" | "neutral" | "accent";
}) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-context-x">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.18em]">Portfolio</span>
            <select
              className="min-h-11 rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
              value={currentPortfolioId ?? portfolioOptions[0]?.value ?? ""}
              onChange={(event) => router.push(portfolioOptions.find((item) => item.value === event.target.value)?.href ?? "/portfolios")}
            >
              {portfolioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.18em]">Building</span>
            <select
              className="min-h-11 rounded-md border border-border bg-panel px-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
              value={currentBuildingId ?? buildingOptions[0]?.value ?? ""}
              onChange={(event) => router.push(buildingOptions.find((item) => item.value === event.target.value)?.href ?? "/portfolios")}
            >
              {buildingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.18em]">Reporting year</span>
            <div className="flex min-h-11 items-center rounded-md border border-border bg-panel px-3 text-sm text-foreground">
              {reportingYear}
            </div>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={globalStatusLabel} tone={globalStatusTone} />
          <Button variant="ghost" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
