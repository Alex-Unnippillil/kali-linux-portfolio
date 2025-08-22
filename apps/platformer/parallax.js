export function createParallaxLayers(images) {
  return images.map((img, i) => ({ image: img, speed: 0.2 * i, x: 0 }));
}

export function updateParallax(layers, cameraX) {
  layers.forEach((layer) => {
    layer.x = -cameraX * layer.speed;
  });
}
