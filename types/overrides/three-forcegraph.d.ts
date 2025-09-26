import type { Object3D } from 'three';

export interface NodeObject {
  id?: string | number;
  index?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  [key: string]: unknown;
}

export interface LinkObject<Node = NodeObject> {
  source?: string | number | Node;
  target?: string | number | Node;
  index?: number;
  [key: string]: unknown;
}

export interface GraphData<Node = NodeObject, Link = LinkObject<Node>> {
  nodes: Node[];
  links: Link[];
}

export class ThreeForceGraphGeneric<
  Instance,
  Node extends NodeObject = NodeObject,
  Link extends LinkObject<Node> = LinkObject<Node>
> extends Object3D {
  constructor();
  graphData(): GraphData<Node, Link>;
  graphData(data: GraphData<Node, Link>): Instance;
}

declare class ThreeForceGraph<
  Node extends NodeObject = NodeObject,
  Link extends LinkObject<Node> = LinkObject<Node>
> extends ThreeForceGraphGeneric<ThreeForceGraph<Node, Link>, Node, Link> {
  constructor();
}

export default ThreeForceGraph;
