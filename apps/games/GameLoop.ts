export type TickHandler = (dt: number) => void;
export type InputHandler = (event: Event) => void;

export default class GameLoop {
  private running = false;
  private last = 0;
  private rafId = 0;
  private tickHandler: TickHandler;
  private inputHandler?: InputHandler;

  constructor(tick: TickHandler, input?: InputHandler) {
    this.tickHandler = tick;
    this.inputHandler = input;
    this.loop = this.loop.bind(this);
    this.onInput = this.onInput.bind(this);
  }

  private loop(time: number) {
    if (!this.running) return;
    const dt = time - this.last;
    this.last = time;
    this.tick(dt);
    this.rafId = requestAnimationFrame(this.loop);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    if (this.inputHandler) window.addEventListener('keydown', this.onInput);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.inputHandler) window.removeEventListener('keydown', this.onInput);
  }

  tick(dt: number) {
    this.tickHandler(dt);
  }

  onInput(event: Event) {
    if (this.inputHandler) this.inputHandler(event);
  }
}
