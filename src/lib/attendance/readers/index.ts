// Reader registry — maps a device protocol to its punch reader.
// To support a new brand: add a reader module and register it here.

import type { DeviceUser, ProbeResult, Punch } from "../types";
import {
  probeConnection as zktecoProbe,
  readPunches as zktecoRead,
  readUsers as zktecoUsers,
} from "./zkteco";

export type DeviceReader = (host: string, port: number, timeoutMs?: number) => Promise<Punch[]>;
export type DeviceProbe = (host: string, port: number, timeoutMs?: number) => Promise<ProbeResult>;
export type DeviceUserReader = (host: string, port: number, timeoutMs?: number) => Promise<DeviceUser[]>;

// Default protocol when a device doesn't specify one. ZK protocol is the most
// common (ZKTeco, eSSL, and many clones).
export const DEFAULT_PROTOCOL = "zkteco";

const READERS: Record<string, DeviceReader> = {
  zkteco: zktecoRead,
  // hikvision: hikvisionRead,
  // suprema: supremaRead,
};

// Connectivity probes, keyed by protocol. A protocol can support pulling
// punches (READERS) without supporting a live probe, and vice versa.
const PROBES: Record<string, DeviceProbe> = {
  zkteco: zktecoProbe,
};

// Enrolled-user readers, keyed by protocol.
const USER_READERS: Record<string, DeviceUserReader> = {
  zkteco: zktecoUsers,
};

export function getReader(protocol?: string | null): DeviceReader {
  const reader = READERS[protocol || DEFAULT_PROTOCOL];
  if (!reader) {
    throw new Error(`No attendance reader registered for protocol "${protocol}"`);
  }
  return reader;
}

/** Read punches from a device using the reader for its protocol. */
export function readDevice(opts: {
  host: string;
  port?: number;
  protocol?: string | null;
  timeoutMs?: number;
}): Promise<Punch[]> {
  return getReader(opts.protocol)(opts.host, opts.port ?? 4370, opts.timeoutMs);
}

/** Whether a live "test connection" probe exists for this protocol. */
export function supportsProbe(protocol?: string | null): boolean {
  return Boolean(PROBES[protocol || DEFAULT_PROTOCOL]);
}

/**
 * Test connectivity to a device using the probe for its protocol. Never
 * throws — an unsupported protocol or failed connection returns
 * { reachable: false } with a friendly reason.
 */
export function probeDevice(opts: {
  host: string;
  port?: number;
  protocol?: string | null;
  timeoutMs?: number;
}): Promise<ProbeResult> {
  const probe = PROBES[opts.protocol || DEFAULT_PROTOCOL];
  if (!probe) {
    return Promise.resolve({
      reachable: false,
      latencyMs: 0,
      error: `Live connection test isn't supported for protocol "${opts.protocol}" yet. Only ZK Protocol (ZKTeco / eSSL) can be tested directly; other brands push punches via the API.`,
    });
  }
  return probe(opts.host, opts.port ?? 4370, opts.timeoutMs);
}

/** Whether enrolled users can be listed for this protocol. */
export function supportsUserList(protocol?: string | null): boolean {
  return Boolean(USER_READERS[protocol || DEFAULT_PROTOCOL]);
}

/** Read the enrolled users from a device using the reader for its protocol. */
export function readDeviceUsers(opts: {
  host: string;
  port?: number;
  protocol?: string | null;
  timeoutMs?: number;
}): Promise<DeviceUser[]> {
  const reader = USER_READERS[opts.protocol || DEFAULT_PROTOCOL];
  if (!reader) {
    throw new Error(
      `Listing users isn't supported for protocol "${opts.protocol}" yet (ZK Protocol only).`
    );
  }
  return reader(opts.host, opts.port ?? 4370, opts.timeoutMs);
}
