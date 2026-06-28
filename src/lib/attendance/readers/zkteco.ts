// ZKTeco reader — talks the ZK protocol (default TCP port 4370) via node-zklib.
// Also covers eSSL and other ZK-protocol clones. One driver among many; see
// ./index.ts for the registry.

import ZKLib from "node-zklib";
import type { Punch } from "../types";

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
