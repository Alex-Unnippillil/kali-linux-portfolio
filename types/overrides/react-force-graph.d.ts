import type { ForwardRefExoticComponent, MutableRefObject, RefAttributes } from 'react';

export interface ForceGraphNode {
  id: string;
  [key: string]: unknown;
}

export interface ForceGraphLink<Node extends ForceGraphNode = ForceGraphNode> {
  source: string | Node;
  target: string | Node;
  [key: string]: unknown;
}

export interface ForceGraphMethods<Node extends ForceGraphNode = ForceGraphNode, Link extends ForceGraphLink<Node> = ForceGraphLink<Node>> {
  zoom(): number;
  zoom(scale: number, ms?: number): void;
  zoomToFit(duration?: number, padding?: number): void;
  centerAt(x: number, y: number, ms?: number): void;
  getGraphBbox(): { x: number; y: number; width: number; height: number };
}

export interface ForceGraphProps<Node extends ForceGraphNode = ForceGraphNode, Link extends ForceGraphLink<Node> = ForceGraphLink<Node>> {
  graphData: { nodes: Node[]; links: Link[] };
  nodeId?: keyof Node | ((node: Node) => string | number);
  nodeCanvasObject?: (node: Node, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint?: (node: Node, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  onBackgroundClick?: () => void;
  onNodeClick?: (node: Node) => void;
  onNodeRightClick?: (node: Node, event: MouseEvent) => void;
  linkColor?: (link: Link) => string;
  linkWidth?: (link: Link) => number;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  linkDirectionalArrowColor?: (link: Link) => string;
  backgroundColor?: string;
}

export type ForceGraphRef<Node extends ForceGraphNode = ForceGraphNode, Link extends ForceGraphLink<Node> = ForceGraphLink<Node>> = MutableRefObject<
  ForceGraphMethods<Node, Link> | undefined
>;

export type ForceGraphComponent<Node extends ForceGraphNode = ForceGraphNode, Link extends ForceGraphLink<Node> = ForceGraphLink<Node>> = ForwardRefExoticComponent<
  ForceGraphProps<Node, Link> & RefAttributes<ForceGraphMethods<Node, Link>>
>;

export const ForceGraph2D: ForceGraphComponent;
export default ForceGraph2D;
