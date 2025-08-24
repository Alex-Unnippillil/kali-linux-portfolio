let howler: typeof import('howler') | null = null;
async function getHowler() {
  if (!howler) {
    howler = await import('howler');
  }
  return howler;
}

export class AudioManager {
  private sounds = new Map<string, import('howler').Howl>();

  async load(key: string, src: string) {
    const { Howl } = await getHowler();
    const sound = new Howl({ src: [src] });
    this.sounds.set(key, sound);
    return sound;
  }

  play(key: string) {
    this.sounds.get(key)?.play();
  }

  stop(key: string) {
    this.sounds.get(key)?.stop();
  }

  async setVolume(volume: number) {
    const { Howler } = await getHowler();
    Howler.volume(volume);
  }
}
