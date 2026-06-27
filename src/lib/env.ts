// Centralized, validated environment config — the single source of truth for
// every env var the server reads. Validation runs lazily on first access so the
// Prisma CLI and seed scripts can import buildDatabaseUrl without it, and the
// browser never runs it. Set SKIP_ENV_VALIDATION=1 to bypass during a build.

import { z } from "zod";

/**
 * Resolve the PostgreSQL connection string.
 *
 * Precedence:
 *   1. `DATABASE_URL` if set — managed providers (Neon, RDS, Supabase) hand you
 *      a full URL, and it should win unchanged.
 *   2. Otherwise assemble it from discrete `DB_*` parts — friendlier for
 *      self-hosting and custom ports. User/password are URL-encoded so special
 *      characters are safe.
 */
export function buildDatabaseUrl(source: NodeJS.ProcessEnv = process.env): string {
  const explicit = source.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const host = source.DB_HOST || "localhost";
  const port = source.DB_PORT || "5432";
  const user = source.DB_USER || "postgres";
  const password = source.DB_PASSWORD ?? "";
  const name = source.DB_NAME || "workseed";
  const schema = source.DB_SCHEMA || "public";

  const credentials = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);

  const params = new URLSearchParams({ schema });
  if (source.DB_SSL === "true") params.set("sslmode", "require");

  return `postgresql://${credentials}@${host}:${port}/${name}?${params.toString()}`;
}

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional(),
  APP_NAME: z.string().min(1).default("Workseed"),
  PORT: z.coerce.number().int().positive().default(3000),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  JWT_SECRET: z.string().min(32, "must be at least 32 characters (try: openssl rand -base64 32)"),

  // Always resolved by buildDatabaseUrl() before parsing, so it is always present.
  DATABASE_URL: z.string().min(1),

  // Email — optional; when SMTP_USER/SMTP_PASSWORD are absent the app falls back
  // to an Ethereal test account in development.
  SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Seed admin — optional overrides for `npm run db:seed`.
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
});

export type Env = z.infer<typeof serverSchema>;

function loadEnv(): Env {
  // Treat empty env vars (KEY=) as unset, so optional fields fall back to their
  // defaults instead of failing validation on an empty string.
  const cleaned = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const raw = { ...cleaned, DATABASE_URL: buildDatabaseUrl() };

  // Skip validation in the browser, and when explicitly opted out (e.g. a
  // container image build / CI step that has no secrets yet).
  if (typeof window !== "undefined" || process.env.SKIP_ENV_VALIDATION) {
    return raw as unknown as Env;
  }

  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\nInvalid environment configuration:\n${issues}\n\n` +
        `Check your .env file against .env.example.` +
        ` (Set SKIP_ENV_VALIDATION=1 to bypass during a build with no secrets.)\n`,
    );
  }
  return parsed.data;
}

let cached: Env | null = null;
function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/**
 * Validated, typed environment. Validation happens on first property access.
 *
 *   import { env } from "@/lib/env";
 *   env.JWT_SECRET // validated string
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
