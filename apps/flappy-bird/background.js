export default class Background {
  constructor(width, height, theme = 'day') {
    this.width = width;
    this.height = height;
    this.themes = {
      day: {
        sky: '#87CEEB',
        layers: [
          { speed: 0.5, offset: 0, height: 40, color: '#7ec850' },
          { speed: 1, offset: 0, height: 20, color: '#4caf50' },
        ],
      },
      night: {
        sky: '#0d1b2a',
        layers: [
          { speed: 0.5, offset: 0, height: 40, color: '#264653' },
          { speed: 1, offset: 0, height: 20, color: '#2a9d8f' },
        ],
      },
    };
    this.setTheme(theme);
  }

  setTheme(theme) {
    this.theme = this.themes[theme] ? theme : 'day';
    this.layers = this.themes[this.theme].layers.map((l) => ({ ...l }));
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
    ctx.fillStyle = this.themes[this.theme].sky;
    ctx.fillRect(0, 0, this.width, this.height);
    this.layers.forEach((layer) => {
      ctx.fillStyle = layer.color;
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
