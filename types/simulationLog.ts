export interface SimulationLogEntry {
  tool: string;
  title: string;
  summary: string;
  data?: Record<string, unknown> | string;
  timestamp: string;
}
