import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors",
            "focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
            "dark:border-gray-700 dark:bg-gray-900 dark:text-white",
            "dark:focus:border-gray-100 dark:focus:ring-gray-100",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
