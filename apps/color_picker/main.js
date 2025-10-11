/* eslint-disable no-top-level-window/no-top-level-window-or-document */

if (isBrowser) {
  const colorInput = document.getElementById('color-input');
  const swatches = document.getElementById('swatches');
  const hexOutput = document.getElementById('hex-output');

  if (!colorInput || !swatches || !hexOutput) {
    console.warn('Color picker: required DOM nodes were not found.');
  } else {
    initializeColorPicker(colorInput, swatches, hexOutput);
  }
}

function initializeColorPicker(colorInput, swatches, hexOutput) {
  if (!(colorInput instanceof HTMLInputElement)) {
    console.warn('Color picker: expected an input element for the color selector.');
    return;
  }

  const colors = [];
  const copyFeedback = ensureFeedback(hexOutput);

  const initialColor = normalizeHex(colorInput.value);
  if (initialColor) {
    hexOutput.textContent = initialColor;
    colors.push(initialColor);
    renderSwatches();
  }

  colorInput.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    addColor(target.value);
  });

  function ensureFeedback(referenceNode) {
    let feedback = document.getElementById('copy-feedback');
    if (feedback) return feedback;

    feedback = document.createElement('div');
    feedback.id = 'copy-feedback';
    feedback.className = 'copy-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    referenceNode.insertAdjacentElement('afterend', feedback);
    return feedback;
  }

  function normalizeHex(color) {
    if (!color) return null;
    let value = color.trim();
    if (!value) return null;
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    if (value.length === 4) {
      value = `#${value
        .slice(1)
        .split('')
        .map((char) => char + char)
        .join('')}`;
    }
    if (value.length !== 7) return null;
    return value.toUpperCase();
  }

  function hexToRgbString(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return '';
    const hex = normalized.slice(1);
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function addColor(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return;

    const existingIndex = colors.indexOf(normalized);
    if (existingIndex !== -1) {
      colors.splice(existingIndex, 1);
    }

    colors.unshift(normalized);
    if (colors.length > 10) {
      colors.length = 10;
    }

    renderSwatches();
    updateCurrentColor(normalized);
  }

  function renderSwatches() {
    swatches.innerHTML = '';

    colors.forEach((color) => {
      const rgbText = hexToRgbString(color);
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.title = rgbText ? `${color} / ${rgbText}` : color;
      swatch.setAttribute(
        'aria-label',
        rgbText ? `Copy ${color} (${rgbText})` : `Copy ${color}`,
      );

      const handleSelection = () => {
        updateCurrentColor(color);
        copyColor(color, rgbText);
      };

      swatch.addEventListener('click', handleSelection);
      swatch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelection();
        }
      });

      swatches.appendChild(swatch);
    });
  }

  function updateCurrentColor(color) {
    hexOutput.textContent = color;
    colorInput.value = color;
  }

  function copyColor(color, rgbText) {
    const message = rgbText ? `Copied ${color} (${rgbText})` : `Copied ${color}`;
    const writeText = navigator?.clipboard?.writeText;

    if (typeof writeText === 'function') {
      writeText
        .call(navigator.clipboard, color)
        .then(() => showFeedback(message))
        .catch((error) => {
          console.error('Failed to copy color to clipboard:', error);
          showFeedback(message);
        });
    } else {
      showFeedback(message);
    }
  }

  function showFeedback(message) {
    if (!copyFeedback) return;
    copyFeedback.textContent = message;
  }

}
