import { KPIBlock } from "./kpi-block";

export type KPIItem = {
  label: string;
  value: string;
  detail?: string;
  trend?: "up" | "down" | "flat";
  emphasize?: boolean;
  tone?: "default" | "danger" | "warning" | "success" | "accent";
};

export function KPIStrip({ items }: { items: KPIItem[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KPIBlock key={item.label} {...item} />
      ))}
    </section>
  );
}
