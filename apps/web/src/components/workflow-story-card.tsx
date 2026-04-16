import Link from "next/link";
import { SectionContainer } from "./ui/section-container";
import { StatusBadge } from "./ui/status-badge";

type WorkflowBadge = {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "accent";
};

type WorkflowLink = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export function WorkflowStoryCard({
  title,
  description,
  badges,
  links
}: {
  title: string;
  description: string;
  badges?: WorkflowBadge[];
  links: WorkflowLink[];
}) {
  return (
    <SectionContainer title={title} description={description}>
      <div className="grid gap-4">
        {badges && badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <StatusBadge key={badge.label} label={badge.label} tone={badge.tone ?? "neutral"} />
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.label}
              className={
                link.variant === "secondary"
                  ? "inline-flex min-h-11 items-center rounded-md border border-border bg-panelAlt px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  : "inline-flex min-h-11 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              }
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
