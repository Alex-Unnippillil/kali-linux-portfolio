import { parseGraph, convertAnalysisToGhidra } from './utils';

let paused = false;

self.onmessage = (e) => {
  const { type, analysis } = e.data || {};
  if (type === 'pause') {
    paused = true;
    return;
  }
  if (type === 'resume') {
    paused = false;
    return;
  }
  if (paused) return;
  if (type === 'graph') {
    const graphData = parseGraph(analysis || '');
    postMessage({ type: 'graph', graphData });
  } else if (type === 'export') {
    const ghidra = convertAnalysisToGhidra(analysis || '');
    postMessage({ type: 'export', ghidra });
  }
};
