export interface NsJailConfig {
  binaryPath: string;
  defaultCpuTimeSec: number;
  defaultWallTimeSec: number;
  defaultMemoryMb: number;
  defaultLanguage: string;
  watchdogGraceMs: number;
  maxProcesses: number;
  uid: number;
  gid: number;
  disableNetwork: boolean;
  mountProc: boolean;
}

export const NSJAIL_CONFIG = Symbol("NSJAIL_CONFIG");

export const nsjailConfig: NsJailConfig = {
  binaryPath: "/usr/sbin/nsjail",
  defaultCpuTimeSec: 2,
  defaultWallTimeSec: 5,
  defaultMemoryMb: 256,
  defaultLanguage: "cpp",
  watchdogGraceMs: 1500,
  maxProcesses: 1,
  uid: 99999,
  gid: 99999,
  disableNetwork: true,
  mountProc: false,
};
