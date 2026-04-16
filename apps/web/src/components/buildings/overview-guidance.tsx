import Link from "next/link";
import type { BuildingReadiness, StartHereStep } from "../../lib/demo-ready";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";

export function OverviewGuidance({
  readiness,
  steps,
  issueCount,
  blockerCount,
  evidenceGapCount
}: {
  readiness: BuildingReadiness;
  steps: StartHereStep[];
  issueCount: number;
  blockerCount: number;
  evidenceGapCount: number;
}) {
  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.95fr)]">
      <SectionContainer
        title="Start Here"
        description="This is the building entry point. Follow the steps in order to move from building context into filing, monitoring, and action."
      >
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={readiness.label} tone={readiness.tone} />
            <StatusBadge label={`${blockerCount} blockers`} tone={blockerCount > 0 ? "danger" : "success"} />
            <StatusBadge label={`${evidenceGapCount} evidence gaps`} tone={evidenceGapCount > 0 ? "warning" : "success"} />
            <StatusBadge label={`${issueCount} active issues`} tone={issueCount > 0 ? "warning" : "neutral"} />
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <Link
                key={step.title}
                className="rounded-md border border-border bg-panelAlt p-4 transition-colors hover:border-accent/35 hover:bg-muted/30"
                href={step.href}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-sm font-semibold text-accent">
                    {index + 1}
                  </div>
                  <div className="grid gap-1">
                    <p className="font-medium text-foreground">{step.title}</p>
                    <p className="text-sm leading-6 text-foreground/74">{step.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            AirWise follows one narrative for every building: understand compliance posture, organize the filing package,
            monitor live performance when available, and then act with supervision.
          </div>
        </div>
      </SectionContainer>

      <SectionContainer
        title="Building Readiness"
        description="Readiness is derived from the existing BAS profile, gateway, telemetry, and control signals already on the building record."
      >
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-panelAlt p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={readiness.shortLabel} tone={readiness.tone} />
              <p className="text-sm font-medium text-foreground">{readiness.label.replace(`${readiness.shortLabel}: `, "")}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/76">{readiness.explanation}</p>
          </div>

          <div className="rounded-md border border-border bg-panelAlt p-4">
            <p className="eyebrow">What to do next</p>
            <p className="mt-2 text-sm leading-6 text-foreground/76">
              The fastest next move for this building is to follow the readiness path instead of exploring every workspace.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              href={readiness.nextActionHref}
            >
              {readiness.nextActionLabel}
            </Link>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
