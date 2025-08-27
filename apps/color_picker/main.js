const colors = [];
const input = document.getElementById('color-input');
const swatches = document.getElementById('swatches');
const copyCurrent = document.getElementById('copy-current');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

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
}

function renderSwatches() {
  swatches.innerHTML = '';
  colors.forEach((color) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'swatch-wrapper';
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(color);
      showToast('Copied');
    });
    wrapper.appendChild(swatch);
    wrapper.appendChild(btn);
    swatches.appendChild(wrapper);
  });
}

input.addEventListener('input', (e) => {
  addColor(e.target.value);
});

copyCurrent.addEventListener('click', () => {
  const color = input.value;
  if (color) {
    navigator.clipboard.writeText(color);
    showToast('Copied');
  }
});
