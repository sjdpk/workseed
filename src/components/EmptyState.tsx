import { cn } from "@/utils";

/** Replaces ~21 hand-rolled "py-12 text-center" blocks, each with its own spacing. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-4 py-12 text-center", className)}
    >
      {icon && <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>}
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
