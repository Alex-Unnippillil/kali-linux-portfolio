export default class Background {
  constructor(width, height, theme = 'day') {
    this.width = width;
    this.height = height;
    this.reducedMotion = false;
    this.colorBlind = false;
    this.themes = {
      day: {
        sky: '#87CEEB',
        layers: [
          { baseSpeed: 0.25, speed: 0.25, offset: 0, height: 60, color: '#a7c957' },
          { baseSpeed: 0.5, speed: 0.5, offset: 0, height: 40, color: '#7ec850' },
          { baseSpeed: 1, speed: 1, offset: 0, height: 20, color: '#4caf50' },
        ],
      },
      night: {
        sky: '#0d1b2a',
        layers: [
          { baseSpeed: 0.25, speed: 0.25, offset: 0, height: 60, color: '#1b263b' },
          { baseSpeed: 0.5, speed: 0.5, offset: 0, height: 40, color: '#264653' },
          { baseSpeed: 1, speed: 1, offset: 0, height: 20, color: '#2a9d8f' },
        ],
      },
    };
    this.setTheme(theme);
  }

  setTheme(theme) {
    this.theme = this.themes[theme] ? theme : 'day';
    this.layers = this.themes[this.theme].layers.map((l) => ({ ...l }));
    this.setReducedMotion(this.reducedMotion);
  }

  setReducedMotion(flag) {
    this.reducedMotion = flag;
    this.layers.forEach((layer) => {
      layer.speed = flag ? 0 : layer.baseSpeed;
    });
  }

  setColorBlind(flag) {
    this.colorBlind = flag;
  }

  update(dt = 1) {
    this.layers.forEach((layer) => {
      layer.offset -= layer.speed * dt;
      if (layer.offset <= -this.width) {
        layer.offset += this.width;
      }
    });
  }

  draw(ctx) {
    const sky = this.colorBlind ? '#000' : this.themes[this.theme].sky;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);
    this.layers.forEach((layer) => {
      const color = this.colorBlind ? '#888' : layer.color;
      ctx.fillStyle = color;
      ctx.fillRect(
        layer.offset,
        this.height - layer.height,
        this.width,
        layer.height
      );
      ctx.fillRect(
        layer.offset + this.width,
        this.height - layer.height,
        this.width,
        layer.height
      );
    });
  }
}
