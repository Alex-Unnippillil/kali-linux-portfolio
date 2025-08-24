import { Howl, Howler } from 'howler';

export class AudioManager {
  private sounds = new Map<string, Howl>();

  load(key: string, src: string) {
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

  setVolume(volume: number) {
    Howler.volume(volume);
  }
}
