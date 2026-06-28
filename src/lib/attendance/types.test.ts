import { describe, it, expect } from "vitest";
import { sourceForType } from "./types";

describe("sourceForType", () => {
  it("maps biometric/face capabilities to BIOMETRIC", () => {
    expect(sourceForType(["BIOMETRIC"])).toBe("BIOMETRIC");
    expect(sourceForType(["FACE"])).toBe("BIOMETRIC");
    expect(sourceForType(["FACE", "RFID"])).toBe("BIOMETRIC");
  });

  it("maps RFID-only to RFID", () => {
    expect(sourceForType(["RFID"])).toBe("RFID");
  });

  it("falls back to OTHER for unknown/empty", () => {
    expect(sourceForType([])).toBe("OTHER");
    expect(sourceForType(["WHATEVER"])).toBe("OTHER");
  });

  it("accepts a single string too", () => {
    expect(sourceForType("BIOMETRIC")).toBe("BIOMETRIC");
  });
});
