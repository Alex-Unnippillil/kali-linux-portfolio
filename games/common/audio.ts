let ctx: AudioContext | null = null;
const nodes = new Set<AudioNode>();

export function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext unavailable');
  }
  if (!ctx) {
    const Ctor =
      (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
    if (!Ctor) {
      throw new Error('AudioContext constructor missing');
    }
    ctx = new Ctor();
  } else if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function requestAudioNode(): GainNode {
  const context = getAudioContext();
  const node = context.createGain();
  node.connect(context.destination);
  nodes.add(node);
  return node;
}

export function releaseAudioNode(node: AudioNode): void {
  if (nodes.has(node)) {
    try {
      node.disconnect();
    } catch {
      /* ignore */
    }
    nodes.delete(node);
  }
  if (ctx && nodes.size === 0) {
    ctx.close();
    ctx = null;
  }
}
