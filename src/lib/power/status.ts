export interface BatteryStatus {
  level: number;
  charging: boolean;
}

export async function getBatteryStatus(): Promise<BatteryStatus> {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      return { level: battery.level, charging: battery.charging };
    } catch {
      // ignore errors and fall back to defaults
    }
  }
  return { level: 1, charging: false };
}
