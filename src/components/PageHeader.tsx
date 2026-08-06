import { cn } from "@/utils";

/**
 * One page header for every screen. Before this, 49 pages hand-rolled the same
 * title/subtitle/action row eleven different ways — different wrappers, two
 * subtitle styles, actions sometimes inside the flow and sometimes not.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  badges,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Buttons or links, right-aligned on wide screens. */
  actions?: React.ReactNode;
  /** Status chips shown next to the title. */
  badges?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
          {badges}
        </div>
        {subtitle && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && (
        /* One row on wide screens — the toolbar only wraps when it genuinely has
           to, which is why items may not stretch (`shrink-0` on the group). */
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
