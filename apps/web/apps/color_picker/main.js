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
  let feedbackTimeoutId = null;

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
    feedback.className = 'copy-feedback copy-feedback--status';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.style.display = 'block';
    feedback.style.marginTop = '0.75rem';
    feedback.style.minHeight = '1.5rem';
    feedback.style.fontSize = '0.95rem';
    feedback.style.lineHeight = '1.4';
    feedback.style.color = 'var(--copy-feedback-color, #f9fafb)';
    feedback.style.transition = 'opacity 150ms ease-in-out';
    feedback.style.opacity = '0';
    feedback.style.letterSpacing = '0.01em';
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
      const swatchTooltip = rgbText ? `${color} (${rgbText})` : color;
      const focusRingStyle =
        '0 0 0 3px rgba(15, 23, 42, 0.8), 0 0 0 5px rgba(59, 130, 246, 0.75)';
      swatch.type = 'button';
      swatch.className = 'swatch swatch--copyable';
      swatch.style.backgroundColor = color;
      swatch.style.borderRadius = '0.75rem';
      swatch.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      swatch.style.margin = '0.25rem';
      swatch.style.width = '3rem';
      swatch.style.height = '3rem';
      swatch.style.display = 'inline-flex';
      swatch.style.alignItems = 'center';
      swatch.style.justifyContent = 'center';
      swatch.style.cursor = 'pointer';
      swatch.style.transition = 'transform 120ms ease, box-shadow 120ms ease';
      swatch.style.outline = 'none';
      swatch.title = `Copy ${swatchTooltip} to clipboard`;
      swatch.setAttribute('aria-label', `Copy ${swatchTooltip} to clipboard`);
      swatch.setAttribute('data-color', color);

      const handleSelection = () => {
        updateCurrentColor(color);
        copyColor(color, rgbText);
      };

      swatch.addEventListener('focus', () => {
        swatch.style.boxShadow = focusRingStyle;
        swatch.style.transform = 'scale(1.03)';
      });

      swatch.addEventListener('blur', () => {
        swatch.style.boxShadow = '';
        swatch.style.transform = '';
      });

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
    const message = rgbText
      ? `${color} (${rgbText}) copied to your clipboard.`
      : `${color} copied to your clipboard.`;
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
    copyFeedback.style.opacity = '1';
    copyFeedback.setAttribute('data-visible', 'true');
    if (feedbackTimeoutId) {
      clearTimeout(feedbackTimeoutId);
    }
    feedbackTimeoutId = setTimeout(() => {
      copyFeedback.style.opacity = '0.7';
      copyFeedback.removeAttribute('data-visible');
    }, 2400);
  }

}
