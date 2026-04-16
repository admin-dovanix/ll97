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
    <section className={cn("rounded-lg border border-border bg-panel", className)}>
      <header className="flex flex-col gap-2 border-b border-border px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/52">Section</p>
          <h2 className="text-[14px] font-medium tracking-[0.01em] text-foreground">{title}</h2>
          {description ? <p className="max-w-3xl text-[12px] leading-6 text-foreground/66">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("px-6 py-5", contentClassName)}>{children}</div>
    </section>
  );
}
