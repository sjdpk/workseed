import { cn } from "@/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  colorClass?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({ src, name, size = "md", className, colorClass }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const defaultColorClass = "bg-gradient-to-br from-blue-500 to-blue-600";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          sizeClasses[size],
          "rounded-full object-cover flex-shrink-0",
          className
        )}
        onError={(e) => {
          // Hide image on error, show initials fallback
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0",
        colorClass || defaultColorClass,
        className
      )}
    >
      {initials}
    </div>
  );
}

// Avatar with image fallback to initials
export function AvatarWithFallback({ src, name, size = "md", className, colorClass }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const defaultColorClass = "bg-gradient-to-br from-blue-500 to-blue-600";

  return (
    <div className={cn(sizeClasses[size], "relative flex-shrink-0", className)}>
      {src ? (
        <>
          <img
            src={src}
            alt={name}
            className="h-full w-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
            }}
          />
          <div
            className={cn(
              "hidden h-full w-full items-center justify-center rounded-full font-semibold text-white",
              colorClass || defaultColorClass
            )}
            style={{ display: "none" }}
          >
            {initials}
          </div>
        </>
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full font-semibold text-white",
            colorClass || defaultColorClass
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
