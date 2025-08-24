import { computeFlowField } from './tower-defense-core';

self.onmessage = (e) => {
  const { towers } = e.data;
  const result = computeFlowField(towers || []);
  (self).postMessage(result);
};
