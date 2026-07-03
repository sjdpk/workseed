import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-zklib so the probe never touches a real socket. vi.hoisted makes
// the mock fns exist before the (hoisted) vi.mock factory runs.
const { createSocket, getInfo, disconnect } = vi.hoisted(() => ({
  createSocket: vi.fn(),
  getInfo: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("node-zklib", () => ({
  default: class {
    createSocket = createSocket;
    getInfo = getInfo;
    disconnect = disconnect;
  },
}));

import { probeConnection } from "./zkteco";

describe("probeConnection", () => {
  beforeEach(() => {
    createSocket.mockReset().mockResolvedValue(undefined);
    getInfo.mockReset().mockResolvedValue({ userCounts: 5, logCounts: 120, logCapacity: 100000 });
    disconnect.mockReset().mockResolvedValue(undefined);
  });

  it("reports reachable with device info on success", async () => {
    const res = await probeConnection("192.168.1.50", 4370);
    expect(res.reachable).toBe(true);
    expect(res.info).toEqual({ users: 5, logs: 120, logCapacity: 100000 });
    expect(typeof res.latencyMs).toBe("number");
    expect(disconnect).toHaveBeenCalled();
  });

  it("stays reachable even if the info read fails", async () => {
    getInfo.mockRejectedValueOnce(new Error("nope"));
    const res = await probeConnection("192.168.1.50", 4370);
    expect(res.reachable).toBe(true);
    expect(res.info).toBeUndefined();
    expect(disconnect).toHaveBeenCalled();
  });

  it("returns a friendly error when the connection is refused", async () => {
    createSocket.mockRejectedValueOnce({ code: "ECONNREFUSED" });
    const res = await probeConnection("192.168.1.50", 4370);
    expect(res.reachable).toBe(false);
    expect(res.error).toMatch(/refused/i);
    expect(disconnect).toHaveBeenCalled();
  });

  it("maps unreachable-host errors", async () => {
    createSocket.mockRejectedValueOnce({ code: "EHOSTUNREACH" });
    const res = await probeConnection("10.0.0.9", 4370);
    expect(res.reachable).toBe(false);
    expect(res.error).toMatch(/unreachable/i);
  });

  it("never throws on unknown errors", async () => {
    createSocket.mockRejectedValueOnce("weird string failure");
    const res = await probeConnection("10.0.0.9", 4370);
    expect(res.reachable).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
