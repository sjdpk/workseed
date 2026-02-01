// Centralized validation module
// Re-exports Zod and provides common validation schemas

// Re-export everything from Zod for centralized imports
export * from "zod";
export { z } from "zod";

import { z } from "zod";

// UUID validation schema
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Email validation schema
export const emailSchema = z.string().email("Invalid email address");

// Pagination query parameters schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Date string validation (ISO 8601 format)
export const dateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid date format" }
);

// Optional date string (allows empty string or valid date)
export const optionalDateStringSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Invalid date format" }
  );

// Non-empty string validation
export const nonEmptyStringSchema = z.string().min(1, "This field is required");

// Phone number validation (basic format)
export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s\-()]+$/, "Invalid phone number format")
  .optional();

// URL validation (optional, allows empty string)
export const optionalUrlSchema = z.string().url().optional().or(z.literal(""));

// Search query parameter schema
export const searchQuerySchema = z.object({
  search: z.string().optional().default(""),
});

// Combined pagination and search schema
export const listQuerySchema = paginationSchema.merge(searchQuerySchema);

// ID parameter schema for route params
export const idParamSchema = z.object({
  id: uuidSchema,
});
