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
    <div className="sticky top-0 z-30 border-b border-border bg-panel">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-3.5">
        <div className="flex flex-wrap items-center gap-3 lg:gap-5">
          <label className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground/54">Portfolio</span>
            <select
              className="min-h-10 rounded-md border border-border bg-panelAlt px-4 text-[13px] font-normal text-foreground outline-none transition-colors focus:border-accent"
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
          <label className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground/54">Building</span>
            <select
              className="min-h-10 rounded-md border border-border bg-panelAlt px-4 text-[13px] font-normal text-foreground outline-none transition-colors focus:border-accent"
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
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-foreground/54">Filing year</span>
            <div className="flex min-h-10 min-w-[88px] items-center rounded-md border border-border bg-panelAlt px-4 text-[13px] font-normal text-foreground">
              {reportingYear}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={globalStatusLabel} tone={globalStatusTone} />
          <Button variant="ghost" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
