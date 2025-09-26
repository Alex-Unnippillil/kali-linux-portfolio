import type { Object3D } from 'three';

export interface GraphData<NodeType = NodeObject, LinkType = LinkObject<NodeType>> {
  nodes: NodeType[];
  links: LinkType[];
}

export type NodeObject = Record<string, unknown>;

export type LinkObject<NodeType = NodeObject> = Record<string, unknown> & {
  source?: NodeType | string | number;
  target?: NodeType | string | number;
};

export type ThreeForceGraphGeneric<ChainableInstance = unknown, NodeType = NodeObject, LinkType = LinkObject<NodeType>> = Object3D;

export default class ThreeForceGraph<NodeType = NodeObject, LinkType = LinkObject<NodeType>> extends Object3D {}
