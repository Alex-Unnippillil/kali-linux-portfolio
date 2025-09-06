let ctx: AudioContext | null = null;
const players = new Map<string, HTMLAudioElement>();

export function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext unavailable');
  }
  if (!ctx) {
    const Ctor =
      (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) {
      throw new Error('AudioContext constructor missing');
    }
    ctx = new Ctor();
  } else if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function getAudioPlayer(src: string): HTMLAudioElement {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    throw new Error('Audio element unavailable');
  }
  let player = players.get(src);
  if (!player) {
    player = new Audio(src);
    players.set(src, player);
  }
  return player;
}

export function releaseAudioPlayer(src: string): void {
  const player = players.get(src);
  if (player) {
    player.pause();
    players.delete(src);
  }
}
