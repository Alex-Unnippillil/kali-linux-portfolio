export interface Artifact {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin: string;
  timestamp: string;
  user?: string;
}

export interface TimelineCategory {
  id: string;
  label: string;
  color: string;
  description?: string;
  icon?: string;
}

export interface TimelineEvent {
  id: string;
  categoryId: string;
  timestamp: string;
  endTimestamp?: string;
  title: string;
  summary: string;
  thumbnail?: string;
  sources?: string[];
}

export interface CaseFileNode {
  name: string;
  thumbnail?: string;
  children?: CaseFileNode[];
}

export interface CaseTimeline {
  categories: TimelineCategory[];
  events: TimelineEvent[];
}

export interface CaseData {
  timeline: CaseTimeline;
  fileTree: CaseFileNode;
}
