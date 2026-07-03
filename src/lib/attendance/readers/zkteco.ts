// ZKTeco reader — talks the ZK protocol (default TCP port 4370) via node-zklib.
// Also covers eSSL and other ZK-protocol clones. One driver among many; see
// ./index.ts for the registry.

import ZKLib from "node-zklib";
import type { DeviceInfo, DeviceUser, ProbeResult, Punch } from "../types";

/** Read the device's enrolled users (name + enrollment PIN + card no). */
export async function readUsers(host: string, port = 4370, timeoutMs = 10000): Promise<DeviceUser[]> {
  const zk = new ZKLib(host, port, timeoutMs, 4000);
  try {
    await zk.createSocket();
    const res = await zk.getUsers();
    return (res?.data ?? []).map((u) => ({
      uid: typeof u.uid === "number" ? u.uid : undefined,
      userId: String(u.userId ?? "").trim(),
      name: typeof u.name === "string" && u.name.trim() ? u.name.trim() : undefined,
      role: typeof u.role === "number" ? u.role : undefined,
      cardno: typeof u.cardno === "number" && u.cardno > 0 ? u.cardno : undefined,
    }));
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

export async function readPunches(host: string, port = 4370, timeoutMs = 10000): Promise<Punch[]> {
  const zk = new ZKLib(host, port, timeoutMs, 4000);
  try {
    await zk.createSocket();
    const res = await zk.getAttendances();
    return (res?.data ?? []).map((log) => ({
      pin: String(log.deviceUserId),
      time: new Date(log.recordTime),
      state: log.state,
    }));
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

/**
 * Test connectivity to a ZK-protocol device without persisting anything.
 * Opens the socket, reads device info (user/log counts), and disconnects.
 * Never throws — a failed connection is returned as { reachable: false }.
 */
export async function probeConnection(
  host: string,
  port = 4370,
  timeoutMs = 8000
): Promise<ProbeResult> {
  const started = Date.now();
  const zk = new ZKLib(host, port, timeoutMs, 4000);
  try {
    // node-zklib's own socket timeout is unreliable for hosts that never accept
    // the TCP connection, so guard the connect with a hard timeout of our own.
    await withTimeout(zk.createSocket(), timeoutMs, "connect");
    const latencyMs = Date.now() - started;

    let info: DeviceInfo | undefined;
    try {
      const raw = (await withTimeout(zk.getInfo(), timeoutMs, "getInfo")) as
        | { userCounts?: number; logCounts?: number; logCapacity?: number }
        | undefined;
      if (raw) {
        info = {
          users: toNum(raw.userCounts),
          logs: toNum(raw.logCounts),
          logCapacity: toNum(raw.logCapacity),
        };
      }
    } catch {
      // The socket opened, so the device is reachable; the info read is a bonus.
    }

    return { reachable: true, latencyMs, info };
  } catch (err) {
    return { reachable: false, latencyMs: Date.now() - started, error: friendlyError(err) };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

function toNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Reject if the promise doesn't settle within `ms`. */
function withTimeout<T>(p: Promise<T>, ms: number, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`__timeout__:${stage}`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Turn a raw socket/library error into an operator-friendly sentence. */
function friendlyError(err: unknown): string {
  // node-zklib rejects with varied shapes ({ err: { code } }, Error, string).
  const code =
    (err as { code?: string })?.code ||
    (err as { err?: { code?: string } })?.err?.code ||
    "";
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "");

  if (raw.startsWith("__timeout__")) {
    return "Timed out — no response from the device. Check that it's powered on, the IP is correct, and no firewall blocks the port.";
  }
  const c = `${code} ${raw}`.toUpperCase();
  if (c.includes("ECONNREFUSED"))
    return "Connection refused — reached the host but the port is closed. Check the port (ZKTeco default is 4370).";
  if (c.includes("EHOSTUNREACH") || c.includes("ENETUNREACH"))
    return "Host unreachable — the server cannot route to that IP. Confirm the device IP and that it's on the same network.";
  if (c.includes("ETIMEDOUT"))
    return "Timed out — no response from the device. Check that it's online and the IP/port are correct.";
  if (c.includes("ENOTFOUND") || c.includes("EAI_AGAIN"))
    return "Host not found — the IP or hostname could not be resolved.";
  return raw || "Could not connect to the device.";
}
