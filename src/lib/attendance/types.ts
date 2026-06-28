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

// Map a device's capabilities to the attendance source label. A device may
// support several; biometric/face win over RFID for the label.
export function sourceForType(types: string[] | string): "BIOMETRIC" | "RFID" | "OTHER" {
  const list = Array.isArray(types) ? types : [types];
  if (list.includes("BIOMETRIC") || list.includes("FACE")) return "BIOMETRIC";
  if (list.includes("RFID")) return "RFID";
  return "OTHER";
}
