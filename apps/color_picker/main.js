const colors = [];
const input = document.getElementById('color-input');
const swatches = document.getElementById('swatches');
const hexOutput = document.getElementById('hex-output');
hexOutput.textContent = input.value;

function addColor(color) {
  if (!color) return;
  const existingIndex = colors.indexOf(color);
  if (existingIndex !== -1) {
    colors.splice(existingIndex, 1);
  }
  colors.unshift(color);
  if (colors.length > 10) {
    colors.pop();
  }
  renderSwatches();
  hexOutput.textContent = color;
}

function renderSwatches() {
  swatches.innerHTML = '';
  colors.forEach((color) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      navigator.clipboard.writeText(color);
      hexOutput.textContent = color;
    });
    swatches.appendChild(swatch);
  });
}

input.addEventListener('input', (e) => {
  addColor(e.target.value);
});
