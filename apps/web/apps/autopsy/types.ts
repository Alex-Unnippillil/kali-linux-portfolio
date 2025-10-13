export interface Artifact {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin: string;
  timestamp: string;
  user?: string;
}
