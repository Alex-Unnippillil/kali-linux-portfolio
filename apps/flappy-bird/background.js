export default class Background {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.layers = [
      { speed: 0.5, offset: 0, height: 40, color: '#7ec850' },
      { speed: 1, offset: 0, height: 20, color: '#4caf50' },
    ];
  }

  update() {
    this.layers.forEach((layer) => {
      layer.offset -= layer.speed;
      if (layer.offset <= -this.width) {
        layer.offset += this.width;
      }
    });
  }

  draw(ctx) {
    ctx.fillStyle = '#87CEEB';
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
