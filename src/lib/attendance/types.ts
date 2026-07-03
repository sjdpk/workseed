// Device-agnostic attendance types shared by the sync core and every reader.

// One normalized punch from any attendance device.
export interface Punch {
  pin: string; // device enrollment id (maps to User.deviceUserId)
  time: Date;
  state?: number; // optional raw verify/state code (device-specific)
}

export interface SyncResult {
  device: string;
  punches: number; // punches read after the watermark
  matched: number; // punches whose PIN resolved to a user
  unmatched: string[]; // PINs with no matching user
  daysWritten: number; // attendance rows created/updated
  error?: string;
}

// Device facts read during a connectivity probe. All optional — a device may
// answer the connection but not every counter (or the info read may fail while
// the socket is still up).
export interface DeviceInfo {
  users?: number; // enrolled users on the device
  logs?: number; // attendance logs currently stored
  logCapacity?: number; // max logs the device can hold
}

// One enrolled user read from a device's on-board user table.
export interface DeviceUser {
  uid?: number; // device storage slot (device-internal)
  userId: string; // enrollment PIN — maps to User.deviceUserId
  name?: string; // name stored on the device
  role?: number; // device role code (0 = user, 14 = admin on most ZK devices)
  cardno?: number; // RFID card number, if enrolled
}

// Result of a "test connection" probe against a device. `reachable` is the
// single source of truth for success; `info`/`error` are diagnostic detail.
export interface ProbeResult {
  reachable: boolean;
  latencyMs: number; // round-trip to establish the connection
  info?: DeviceInfo;
  error?: string; // human-readable reason when unreachable
}

// Map a device's capabilities to the attendance source label. A device may
// support several; biometric/face win over RFID for the label.
export function sourceForType(types: string[] | string): "BIOMETRIC" | "RFID" | "OTHER" {
  const list = Array.isArray(types) ? types : [types];
  if (list.includes("BIOMETRIC") || list.includes("FACE")) return "BIOMETRIC";
  if (list.includes("RFID")) return "RFID";
  return "OTHER";
}
