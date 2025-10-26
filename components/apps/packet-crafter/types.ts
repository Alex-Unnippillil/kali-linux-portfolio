export type PacketLayerType =
  | 'ethernet'
  | 'ipv4'
  | 'ipv6'
  | 'tcp'
  | 'udp'
  | 'icmp'
  | 'dns'
  | 'http';

export interface PacketLayer {
  type: PacketLayerType;
  fields: Record<string, string>;
}

export interface PacketTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  layers: PacketLayer[];
}

export interface LayerDiffChange {
  field: string;
  currentValue: string;
  templateValue: string;
}

export interface LayerDiff {
  layerType: PacketLayerType;
  changes: LayerDiffChange[];
}
