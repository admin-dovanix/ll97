import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function SectionContainer({
  title,
  description,
  actions,
  children,
  className,
  contentClassName
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}>) {
  return (
    <section className={cn("rounded-lg border border-border bg-panel shadow-inset", className)}>
      <header className="flex flex-col gap-3 border-b border-border px-panel py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section</p>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">{title}</h2>
          {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("px-panel py-4", contentClassName)}>{children}</div>
    </section>
  );
}
