import Link from "next/link";

const items = [
  { href: "overview", label: "Overview" },
  { href: "filing", label: "Filing" },
  { href: "compliance", label: "Compliance" },
  { href: "documents", label: "Documents" },
  { href: "monitoring", label: "Monitoring" },
  { href: "recommendations", label: "Recommendations" }
] as const;

export function BuildingNav({ buildingId }: { buildingId: string }) {
  return (
    <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={`/buildings/${buildingId}/${item.href}`}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(22, 50, 39, 0.12)",
            background: "rgba(255, 255, 255, 0.72)"
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
