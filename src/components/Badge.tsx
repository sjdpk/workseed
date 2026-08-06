import { cn } from "@/utils";

/** Status chip. Replaces ~21 inline spans and five duplicated colour maps. */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  success: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  accent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
};

/** Maps the status vocabularies already used across the app onto a tone, so
 *  callers pass the value they already have instead of picking colours. */
export function toneForStatus(status?: string | null): BadgeTone {
  switch ((status || "").toUpperCase()) {
    case "APPROVED":
    case "ACTIVE":
    case "AVAILABLE":
    case "SENT":
    case "PRESENT":
    case "NEW":
    case "EXCELLENT":
      return "success";
    case "PENDING":
    case "MAINTENANCE":
    case "QUEUED":
    case "LATE":
    case "FAIR":
      return "warning";
    case "REJECTED":
    case "SUSPENDED":
    case "FAILED":
    case "LOST":
    case "DAMAGED":
    case "ABSENT":
    case "POOR":
      return "danger";
    case "ASSIGNED":
    case "IMPORTANT":
    case "GOOD":
      return "info";
    default:
      return "neutral";
  }
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
