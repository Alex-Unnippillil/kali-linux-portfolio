'use client';

export async function loadSound(src: string) {
  const { Howl } = await import('howler');
  return new Howl({ src: [src] });
}
