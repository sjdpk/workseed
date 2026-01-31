import { cn } from "@/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-gray-900";

    const variants = {
      primary: "bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
      outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400 dark:border-gray-600 dark:bg-transparent dark:text-gray-200 dark:hover:bg-gray-800",
      ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800",
      danger: "bg-gray-900 text-white hover:bg-red-600 focus:ring-red-500 dark:bg-white dark:text-gray-900 dark:hover:bg-red-500 dark:hover:text-white",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
