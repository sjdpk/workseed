import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to max, then blocks", () => {
    const key = "test-a";
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    expect(rateLimit("test-b", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("test-c", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("test-b", 1, 60_000).allowed).toBe(false);
  });
});
