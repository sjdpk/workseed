import Link from "next/link";
import { Card } from "./Card";

/**
 * A KPI tile: coloured icon, label, value.
 *
 * The label is kept to one line — a wrapping label made one tile taller than its
 * neighbours, which is what broke the row's rhythm. Long labels truncate with the
 * full text in a tooltip rather than reflowing the card.
 */
export function StatCard({
  label,
  value,
  icon,
  /** Tailwind background classes for the icon tile. */
  color = "bg-gray-900 dark:bg-white dark:text-gray-900",
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  href?: string;
}) {
  const body = (
    <Card className="flex h-full items-center gap-3 p-3 transition-colors hover:border-gray-300 dark:hover:border-gray-600">
      <div className={`shrink-0 rounded-md p-2.5 ${color}`}>
        <div className="text-white">{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400" title={label}>
          {label}
        </p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
