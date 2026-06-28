import { describe, it, expect } from "vitest";
import { buildDatabaseUrl } from "./env";

describe("buildDatabaseUrl", () => {
  it("uses DATABASE_URL verbatim when set", () => {
    const url = buildDatabaseUrl({ DATABASE_URL: "postgresql://x:y@h:1/db" });
    expect(url).toBe("postgresql://x:y@h:1/db");
  });

  it("assembles from parts with a custom port and schema", () => {
    const url = buildDatabaseUrl({
      DB_HOST: "localhost",
      DB_PORT: "5433",
      DB_USER: "postgres",
      DB_PASSWORD: "secret",
      DB_NAME: "workseed",
    });
    expect(url).toBe("postgresql://postgres:secret@localhost:5433/workseed?schema=public");
  });

  it("url-encodes credentials and adds sslmode when DB_SSL=true", () => {
    const url = buildDatabaseUrl({
      DB_USER: "po st",
      DB_PASSWORD: "p@ss/word",
      DB_SSL: "true",
    });
    expect(url).toContain("po%20st:p%40ss%2Fword@");
    expect(url).toContain("sslmode=require");
  });
});
