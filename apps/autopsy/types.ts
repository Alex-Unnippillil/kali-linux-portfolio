import type { LineageMetadata } from '../../utils/lineage';

export interface Artifact {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin: string;
  timestamp: string;
  user?: string;
  tags?: string[];
  lineage?: LineageMetadata;
}
