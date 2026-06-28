// Minimal type declarations for node-zklib (ships no types).
declare module "node-zklib" {
  interface ZKAttendanceLog {
    userSn?: number;
    deviceUserId: string; // enrollment PIN
    recordTime: string | Date;
    ip?: string;
    type?: number;
    state?: number;
  }

  export default class ZKLib {
    constructor(ip: string, port: number, timeout?: number, inport?: number);
    createSocket(cb?: () => void, errCb?: (err: Error) => void): Promise<void>;
    getAttendances(cb?: unknown): Promise<{ data: ZKAttendanceLog[] }>;
    getInfo(): Promise<unknown>;
    disconnect(): Promise<void>;
  }
}
