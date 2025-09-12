import { publish, subscribe } from './pubsub';

export interface ReservedRegion {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

const regions = new Map<string, ReservedRegion>();

export function addReservedRegion(id: string, rect: ReservedRegion) {
  regions.set(id, rect);
  publish('reserved-regions', Array.from(regions.values()));
}

export function removeReservedRegion(id: string) {
  regions.delete(id);
  publish('reserved-regions', Array.from(regions.values()));
}

export function getReservedRegions(): ReservedRegion[] {
  return Array.from(regions.values());
}

export function subscribeReservedRegions(cb: (regions: ReservedRegion[]) => void) {
  return subscribe('reserved-regions', cb as any);
}
