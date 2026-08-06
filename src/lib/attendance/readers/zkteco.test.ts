import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-zklib so the probe never touches a real socket. vi.hoisted makes
// the mock fns exist before the (hoisted) vi.mock factory runs.
const { createSocket, getInfo, getUsers, disconnect } = vi.hoisted(() => ({
  createSocket: vi.fn(),
  getInfo: vi.fn(),
  getUsers: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("node-zklib", () => ({
  default: class {
    createSocket = createSocket;
    getInfo = getInfo;
    getUsers = getUsers;
    disconnect = disconnect;
  },
}));

import { probeConnection, readUsers } from "./zkteco";

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

describe("readUsers", () => {
  beforeEach(() => {
    createSocket.mockReset().mockResolvedValue(undefined);
    disconnect.mockReset().mockResolvedValue(undefined);
    getUsers.mockReset();
  });

  it("normalizes device users (PIN as string, trims name, drops empty card)", async () => {
    getUsers.mockResolvedValue({
      data: [
        { uid: 1, userId: 1001, name: "  John Doe ", role: 0, cardno: 12345 },
        { uid: 2, userId: "1002", name: "", role: 14, cardno: 0 },
      ],
    });
    const users = await readUsers("192.168.1.50", 4370);
    expect(users[0]).toEqual({ uid: 1, userId: "1001", name: "John Doe", role: 0, cardno: 12345 });
    // empty name -> undefined, cardno 0 -> undefined
    expect(users[1]).toEqual({
      uid: 2,
      userId: "1002",
      name: undefined,
      role: 14,
      cardno: undefined,
    });
    expect(disconnect).toHaveBeenCalled();
  });

  it("returns an empty array when the device has no users", async () => {
    getUsers.mockResolvedValue({ data: [] });
    expect(await readUsers("192.168.1.50", 4370)).toEqual([]);
  });

  it("disconnects even when the read throws", async () => {
    getUsers.mockRejectedValue(new Error("read failed"));
    await expect(readUsers("192.168.1.50", 4370)).rejects.toThrow("read failed");
    expect(disconnect).toHaveBeenCalled();
  });
});
