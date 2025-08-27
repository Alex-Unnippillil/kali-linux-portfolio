export function rasterizeFiglet(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const lines = text.split('\n');
  const fontSize = 16;
  ctx.font = `${fontSize}px monospace`;
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const height = lines.length * fontSize;
  canvas.width = width;
  canvas.height = height;
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#000';
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, (i + 1) * fontSize);
  });
  return canvas.toDataURL('image/png');
}
