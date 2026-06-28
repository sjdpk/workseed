// Reader registry — maps a device protocol to its punch reader.
// To support a new brand: add a reader module and register it here.

import type { Punch } from "../types";
import { readPunches as zktecoRead } from "./zkteco";

export type DeviceReader = (host: string, port: number, timeoutMs?: number) => Promise<Punch[]>;

// Default protocol when a device doesn't specify one. ZK protocol is the most
// common (ZKTeco, eSSL, and many clones).
export const DEFAULT_PROTOCOL = "zkteco";

const READERS: Record<string, DeviceReader> = {
  zkteco: zktecoRead,
  // hikvision: hikvisionRead,
  // suprema: supremaRead,
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
