import { KPIBlock } from "./kpi-block";

export type KPIItem = {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
  emphasize?: boolean;
};

export function KPIStrip({ items }: { items: KPIItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-panel px-panel py-4 shadow-inset">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <KPIBlock key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
