export default class GameLoop {
    constructor(tick, input, options = {}) {
        this.running = false;
        this.last = 0;
        this.rafId = 0;
        this.accumulator = 0;
        this.tickHandler = tick;
        this.inputHandler = input;
        this.step = options.fps ? 1000 / options.fps : 16; // default ~60fps
        this.maxDt = options.maxDt ?? 100; // default clamp 100ms
        this.renderHandler = options.render;
        this.interpolate = !!options.interpolation;
        this.loop = this.loop.bind(this);
        this.onInput = this.onInput.bind(this);
    }
    loop(time) {
        if (!this.running)
            return;
        let dt = time - this.last;
        if (dt < 0)
            dt = 0;
        if (dt > this.maxDt)
            dt = this.maxDt;
        this.accumulator += dt;
        while (this.accumulator >= this.step) {
            this.tickHandler(this.step);
            this.accumulator -= this.step;
        }
        if (this.renderHandler) {
            const alpha = this.interpolate ? this.accumulator / this.step : 1;
            this.renderHandler(alpha);
        }
        this.last = time;
        this.rafId = requestAnimationFrame(this.loop);
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.last = performance.now();
        this.accumulator = 0;
        this.rafId = requestAnimationFrame(this.loop);
        if (this.inputHandler)
            window.addEventListener('keydown', this.onInput);
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
        if (this.inputHandler)
            window.removeEventListener('keydown', this.onInput);
    }
    onInput(event) {
        if (this.inputHandler)
            this.inputHandler(event);
    }
}
