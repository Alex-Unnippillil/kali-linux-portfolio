import type { ComponentType } from 'react';

declare namespace ForceGraph3D {
  interface GraphData<Node = unknown, Link = unknown> {
    nodes: Node[];
    links: Link[];
  }

  type Accessor<In, Out> = ((item: In) => Out) | Out | keyof In;

  interface ForceGraphProps<Node = unknown, Link = unknown> {
    graphData?: GraphData<Node, Link>;
    nodeId?: Accessor<Node, string | number>;
    linkSource?: Accessor<Link, string | number | Node>;
    linkTarget?: Accessor<Link, string | number | Node>;
    onNodeClick?: (node: Node, event: MouseEvent) => void;
    onLinkClick?: (link: Link, event: MouseEvent) => void;
  }
}

declare const ForceGraph3D: ComponentType<ForceGraph3D.ForceGraphProps> & {
  ForceGraphMethods?: unknown;
};

export interface ConfigOptions<Node = unknown, Link = unknown>
  extends ForceGraph3D.ForceGraphProps<Node, Link> {}

export interface ForceGraph3DInstance<Node = unknown, Link = unknown> {
  graphData(data: ForceGraph3D.GraphData<Node, Link>): this;
  graphData(): ForceGraph3D.GraphData<Node, Link>;
}

export type { ForceGraph3D };
export default ForceGraph3D;
