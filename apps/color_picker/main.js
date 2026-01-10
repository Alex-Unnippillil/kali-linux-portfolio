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

  const tokenDefinitions = [
    {
      name: '--color-bg',
      label: 'Background',
      description: 'Desktop background and window surfaces.',
    },
    {
      name: '--color-text',
      label: 'Primary text',
      description: 'Default text and icon color.',
    },
    {
      name: '--color-primary',
      label: 'Primary accent',
      description: 'Focus rings, primary buttons, and highlights.',
    },
    {
      name: '--color-accent',
      label: 'Secondary accent',
      description: 'Hover accents and supporting highlights.',
    },
    {
      name: '--color-muted',
      label: 'Muted surface',
      description: 'Panels, modals, and secondary surfaces.',
    },
    {
      name: '--color-info',
      label: 'Info highlight',
      description: 'Informational banners and badges.',
    },
    {
      name: '--color-success',
      label: 'Success',
      description: 'Positive state indicators.',
    },
    {
      name: '--color-warning',
      label: 'Warning',
      description: 'Caution states and alerts.',
    },
    {
      name: '--color-error',
      label: 'Error',
      description: 'Error and danger notifications.',
    },
    {
      name: '--color-terminal',
      label: 'Terminal green',
      description: 'Terminal output and code highlights.',
    },
  ];

  const fallbackTokenValues = {
    '--color-bg': '#0B121A',
    '--color-text': '#F5FAFF',
    '--color-primary': '#0F94D2',
    '--color-accent': '#0F94D2',
    '--color-muted': '#1A2533',
    '--color-info': '#38BDF8',
    '--color-success': '#45FF9A',
    '--color-warning': '#F5B74D',
    '--color-error': '#FF4D6D',
    '--color-terminal': '#45FF9A',
  };

  const colors = [];
  const tokenState = new Map();
  const defaultTokenValues = new Map();
  const copyFeedback = ensureFeedback(hexOutput);
  const exportFeedback = document.getElementById('token-feedback');
  const cssOutput = document.getElementById('css-output');
  const jsonOutput = document.getElementById('json-output');
  const tokenGrid = document.getElementById('token-grid');
  const jsonImport = document.getElementById('json-import');
  const tokenFileInput = document.getElementById('token-file');
  const applyJsonButton = document.getElementById('apply-json');
  const resetButton = document.getElementById('reset-tokens');
  const copyButtons = document.querySelectorAll('[data-copy-target]');
  const downloadButtons = document.querySelectorAll('[data-download-target]');

  let feedbackTimeoutId = null;
  let tokenFeedbackTimeoutId = null;
  let suppressAutoAssign = false;
  let currentColor = null;

  initializeTokenState();
  syncColorsFromTokens(true);

  const initialColor = normalizeHex(colorInput.value);
  if (initialColor) {
    ensureColorInSwatches(initialColor, { refresh: false });
    updateCurrentColor(initialColor);
    renderSwatches();
  } else if (colors.length > 0) {
    updateCurrentColor(colors[0]);
  }

  renderTokenAssignments();
  updateExports();
  updateApplyButtonsState();

  colorInput.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    addColor(target.value);
  });

  copyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-copy-target');
      if (!targetId) return;
      copyTextFromElement(targetId, button);
    });
  });

  downloadButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-download-target');
      const fileName = button.getAttribute('data-download-name') || 'tokens.txt';
      if (!targetId) return;
      downloadTextContent(targetId, fileName);
    });
  });

  if (applyJsonButton && jsonImport) {
    applyJsonButton.addEventListener('click', () => {
      applyTokenJsonFromText(jsonImport.value);
    });
  }

  if (tokenFileInput) {
    tokenFileInput.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.files || target.files.length === 0) {
        return;
      }
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result ?? '{}');
          const updated = applyTokenObject(parsed, 'imported');
          showTokenFeedback(
            updated
              ? `Imported ${updated} token${updated === 1 ? '' : 's'} from ${file.name}.`
              : `No theme tokens were found in ${file.name}.`
          );
        } catch (error) {
          console.error('Failed to parse token JSON file.', error);
          showTokenFeedback('Unable to parse the uploaded JSON file.');
        } finally {
          target.value = '';
        }
      };
      reader.onerror = () => {
        console.error('Failed to read token JSON file.');
        showTokenFeedback('Failed to read the uploaded JSON file.');
        target.value = '';
      };
      reader.readAsText(file);
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      tokenDefinitions.forEach((definition) => {
        const fallback = defaultTokenValues.get(definition.name) || fallbackTokenValues[definition.name];
        if (!fallback) return;
        tokenState.set(definition.name, { value: fallback, mode: 'initial' });
      });
      renderTokenAssignments();
      updateExports();
      syncColorsFromTokens(true);
      updateApplyButtonsState();
      showTokenFeedback('Token assignments restored to the active theme.');
    });
  }

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

  function parseColorToHex(color) {
    if (!color) return null;
    const normalizedHex = normalizeHex(color);
    if (normalizedHex) return normalizedHex;
    const trimmed = color.trim();
    const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgbMatch) return null;
    const [, r, g, b] = rgbMatch;
    const clamp = (component) => {
      const value = Number(component);
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.min(255, value));
    };
    const toHex = (component) => clamp(component).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
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

  function initializeTokenState() {
    const computed = typeof window !== 'undefined'
      ? window.getComputedStyle(document.documentElement)
      : null;

    tokenDefinitions.forEach((definition) => {
      const computedValue = computed ? parseColorToHex(computed.getPropertyValue(definition.name)) : null;
      const fallback = fallbackTokenValues[definition.name];
      const value = computedValue || fallback || '#0F94D2';
      tokenState.set(definition.name, { value, mode: 'initial' });
      defaultTokenValues.set(definition.name, value);
    });
  }

  function addColor(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return;

    const existingIndex = colors.indexOf(normalized);
    if (existingIndex !== -1) {
      colors.splice(existingIndex, 1);
    }

    colors.unshift(normalized);
    if (colors.length > 12) {
      colors.length = 12;
    }

    renderSwatches();
    updateCurrentColor(normalized);

    if (suppressAutoAssign) return;

    const assigned = assignColorToNextToken(normalized);
    if (assigned) {
      renderTokenAssignments();
      updateExports();
      updateApplyButtonsState();
      showTokenFeedback(`Assigned ${normalized} to ${assigned.label}.`);
    }
  }

  function assignColorToNextToken(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return null;

    const alreadyAssigned = tokenDefinitions.find((definition) => {
      const entry = tokenState.get(definition.name);
      return entry?.value === normalized;
    });

    if (alreadyAssigned) {
      return null;
    }

    const candidates = tokenDefinitions.filter((definition) => {
      const entry = tokenState.get(definition.name);
      if (!entry) return true;
      return entry.mode === 'initial' || entry.mode === 'auto';
    });

    if (candidates.length === 0) {
      return null;
    }

    const target = candidates.find((definition) => {
      const entry = tokenState.get(definition.name);
      return !entry || !entry.value || entry.mode === 'initial';
    }) || candidates[0];

    tokenState.set(target.name, { value: normalized, mode: 'auto' });
    return target;
  }

  function renderSwatches() {
    swatches.innerHTML = '';

    colors.forEach((color) => {
      const rgbText = hexToRgbString(color);
      const relatedTokens = tokensUsingColor(color);
      const swatch = document.createElement('button');
      const tokenLabel = relatedTokens.length ? relatedTokens.join(' / ') : '';
      const tooltipParts = [color];
      if (rgbText) tooltipParts.push(`(${rgbText})`);
      if (tokenLabel) tooltipParts.push(`Tokens: ${tokenLabel}`);
      const tooltip = tooltipParts.join(' ');

      swatch.type = 'button';
      swatch.className = 'swatch swatch--copyable';
      swatch.style.backgroundColor = color;
      swatch.setAttribute('data-color', color);
      swatch.setAttribute('data-tokens', tokenLabel);
      swatch.setAttribute('role', 'listitem');
      swatch.title = `Copy ${tooltip} to clipboard`;
      swatch.setAttribute('aria-label', `Copy ${tooltip} to clipboard`);

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
    const normalized = normalizeHex(color);
    currentColor = normalized;
    if (normalized) {
      hexOutput.textContent = normalized;
      colorInput.value = normalized.toLowerCase();
    } else {
      hexOutput.textContent = '';
    }
    updateApplyButtonsState();
  }

  function ensureColorInSwatches(color, options = {}) {
    const normalized = normalizeHex(color);
    if (!normalized) return;

    const previousState = suppressAutoAssign;
    suppressAutoAssign = true;

    const existingIndex = colors.indexOf(normalized);
    if (existingIndex !== -1) {
      colors.splice(existingIndex, 1);
    }

    colors.unshift(normalized);
    if (colors.length > 12) {
      colors.length = 12;
    }

    suppressAutoAssign = previousState;

    if (options.refresh !== false) {
      renderSwatches();
    }
  }

  function syncColorsFromTokens(force = false) {
    if (!force) return;
    const uniqueColors = [];
    tokenDefinitions.forEach((definition) => {
      const entry = tokenState.get(definition.name);
      if (!entry?.value) return;
      if (!uniqueColors.includes(entry.value)) {
        uniqueColors.push(entry.value);
      }
    });

    if (uniqueColors.length === 0) return;

    const previousState = suppressAutoAssign;
    suppressAutoAssign = true;
    colors.length = 0;
    uniqueColors.forEach((value) => {
      colors.push(value);
    });
    suppressAutoAssign = previousState;

    renderSwatches();
  }

  function tokensUsingColor(color) {
    const normalized = normalizeHex(color);
    if (!normalized) return [];
    return tokenDefinitions
      .filter((definition) => tokenState.get(definition.name)?.value === normalized)
      .map((definition) => definition.label);
  }

  function renderTokenAssignments() {
    if (!tokenGrid) return;
    tokenGrid.innerHTML = '';

    tokenDefinitions.forEach((definition) => {
      const entry = tokenState.get(definition.name);
      const value = entry?.value || '';
      const mode = entry?.mode || 'initial';
      const safeId = definition.name.replace(/^--/, '').replace(/[^a-z0-9-]/gi, '-');
      const row = document.createElement('div');
      row.className = 'token-row';
      row.setAttribute('role', 'listitem');

      const label = document.createElement('label');
      label.className = 'token-row__label';
      label.setAttribute('for', `token-hex-${safeId}`);
      label.innerHTML = `<strong>${definition.label}</strong><span>${definition.name}</span>`;

      const colorInputField = document.createElement('input');
      colorInputField.type = 'color';
      colorInputField.className = 'token-row__input';
      colorInputField.id = `token-color-${safeId}`;
      colorInputField.value = (value || '#000000').toLowerCase();
      colorInputField.addEventListener('input', () => {
        const normalized = normalizeHex(colorInputField.value);
        if (!normalized) return;
        updateTokenValue(definition.name, normalized, 'manual');
      });

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'token-row__input';
      textInput.id = `token-hex-${safeId}`;
      textInput.value = value;
      textInput.placeholder = '#0F94D2';
      textInput.spellcheck = false;
      textInput.addEventListener('blur', () => {
        updateTokenValue(definition.name, textInput.value, 'manual');
      });
      textInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          updateTokenValue(definition.name, textInput.value, 'manual');
        }
      });

      const actions = document.createElement('div');
      actions.className = 'token-row__actions';

      const applyButton = document.createElement('button');
      applyButton.type = 'button';
      applyButton.className = 'token-row__apply';
      applyButton.textContent = 'Use current swatch';
      applyButton.disabled = !currentColor;
      applyButton.addEventListener('click', () => {
        if (!currentColor) return;
        updateTokenValue(definition.name, currentColor, 'manual');
      });

      const modeLabel = document.createElement('span');
      modeLabel.className = 'token-row__meta';
      modeLabel.textContent = describeTokenMode(mode);

      actions.append(applyButton, modeLabel);
      row.append(label, colorInputField, textInput, actions);
      tokenGrid.appendChild(row);
    });
  }

  function describeTokenMode(mode) {
    switch (mode) {
      case 'manual':
        return 'Set manually';
      case 'imported':
        return 'Imported token';
      case 'auto':
        return 'Auto-assigned from swatch';
      default:
        return 'Active theme default';
    }
  }

  function updateTokenValue(tokenName, color, mode, options = {}) {
    const { ensureSwatch = true, refresh = true } = options;
    const parsed = parseColorToHex(color);
    if (!parsed) return false;

    const entry = tokenState.get(tokenName);
    if (!entry || entry.value === parsed) {
      tokenState.set(tokenName, { value: parsed, mode });
    } else {
      tokenState.set(tokenName, { value: parsed, mode });
    }

    if (ensureSwatch) {
      ensureColorInSwatches(parsed, { refresh });
    }

    if (refresh) {
      renderTokenAssignments();
      updateExports();
      updateApplyButtonsState();
    }

    return true;
  }

  function updateApplyButtonsState() {
    const buttons = document.querySelectorAll('.token-row__apply');
    buttons.forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = !currentColor;
      }
    });
  }

  function updateExports() {
    if (!cssOutput || !jsonOutput) return;

    const cssLines = tokenDefinitions.map((definition) => {
      const entry = tokenState.get(definition.name);
      const value = entry?.value || fallbackTokenValues[definition.name] || '#000000';
      return `  ${definition.name}: ${value};`;
    });

    cssOutput.value = `:root {\n${cssLines.join('\n')}\n}`;

    const jsonColors = {};
    tokenDefinitions.forEach((definition) => {
      const entry = tokenState.get(definition.name);
      const value = entry?.value || fallbackTokenValues[definition.name];
      if (value) {
        jsonColors[definition.name.replace(/^--/, '')] = value;
      }
    });

    const payload = {
      name: 'kali-custom-theme',
      updatedAt: new Date().toISOString(),
      colors: jsonColors,
    };

    jsonOutput.value = JSON.stringify(payload, null, 2);
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

  function copyTextFromElement(targetId, trigger) {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) {
      showTokenFeedback('Nothing to copy yet.');
      return;
    }

    const value = target.value;
    if (!value) {
      showTokenFeedback('Nothing to copy yet.');
      return;
    }

    const label = trigger?.closest('[data-export-type]')?.getAttribute('data-export-type') || 'tokens';
    const writeText = navigator?.clipboard?.writeText;

    if (typeof writeText === 'function') {
      writeText
        .call(navigator.clipboard, value)
        .then(() => showTokenFeedback(`Copied ${label} to clipboard.`))
        .catch((error) => {
          console.error('Failed to copy export snippet:', error);
          showTokenFeedback(`Copied ${label} to clipboard.`);
        });
    } else {
      showTokenFeedback(`Copied ${label} to clipboard.`);
    }
  }

  function downloadTextContent(targetId, fileName) {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) {
      showTokenFeedback('Nothing to download yet.');
      return;
    }
    const value = target.value;
    if (!value) {
      showTokenFeedback('Nothing to download yet.');
      return;
    }
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showTokenFeedback(`Downloaded ${fileName}.`);
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

  function showTokenFeedback(message) {
    if (!exportFeedback) return;
    exportFeedback.textContent = message;
    exportFeedback.style.opacity = '1';
    if (tokenFeedbackTimeoutId) {
      clearTimeout(tokenFeedbackTimeoutId);
    }
    tokenFeedbackTimeoutId = setTimeout(() => {
      exportFeedback.style.opacity = '0.82';
    }, 2600);
  }

  function applyTokenJsonFromText(text) {
    if (!text || !text.trim()) {
      showTokenFeedback('Paste JSON tokens before applying.');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const updated = applyTokenObject(parsed, 'imported');
      showTokenFeedback(
        updated
          ? `Updated ${updated} token${updated === 1 ? '' : 's'} from pasted JSON.`
          : 'No recognized theme tokens found in the provided JSON.'
      );
    } catch (error) {
      console.error('Failed to parse pasted token JSON.', error);
      showTokenFeedback('The pasted JSON is invalid. Please fix it and try again.');
    }
  }

  function applyTokenObject(data, mode) {
    if (!data || typeof data !== 'object') return 0;

    const lookup = buildColorLookup(data);
    if (lookup.size === 0) {
      return 0;
    }

    let updatedCount = 0;

    tokenDefinitions.forEach((definition) => {
      const candidates = getTokenKeyVariants(definition.name);
      for (const candidate of candidates) {
        const value = lookup.get(candidate);
        if (value) {
          const updated = updateTokenValue(definition.name, value, mode, {
            ensureSwatch: false,
            refresh: false,
          });
          if (updated) {
            updatedCount += 1;
          }
          break;
        }
      }
    });

    if (updatedCount > 0) {
      renderTokenAssignments();
      updateExports();
      syncColorsFromTokens(true);
      updateApplyButtonsState();
    }

    return updatedCount;
  }

  function buildColorLookup(data) {
    const lookup = new Map();

    const visit = (value, path) => {
      if (typeof value === 'string') {
        const parsed = parseColorToHex(value);
        if (!parsed) return;
        const joined = path.join('.');
        const last = path[path.length - 1];
        const normalizedKeys = new Set();
        if (joined) normalizedKeys.add(joined.toLowerCase());
        if (last) {
          normalizedKeys.add(last.toLowerCase());
          normalizedKeys.add(last.replace(/_/g, '-').toLowerCase());
        }
        normalizedKeys.forEach((key) => {
          if (!lookup.has(key)) {
            lookup.set(key, parsed);
          }
        });
        return;
      }
      if (!value || typeof value !== 'object') {
        return;
      }
      Object.entries(value).forEach(([key, nested]) => {
        visit(nested, [...path, key]);
      });
    };

    visit(data, []);
    return lookup;
  }

  function getTokenKeyVariants(tokenName) {
    const base = tokenName.replace(/^--/, '').toLowerCase();
    const noColorPrefix = base.startsWith('color-') ? base.replace(/^color-/, '') : base;
    return [
      tokenName.toLowerCase(),
      base,
      base.replace(/-/g, '_'),
      base.replace(/-/g, ''),
      noColorPrefix,
      noColorPrefix.replace(/-/g, '_'),
      noColorPrefix.replace(/-/g, ''),
    ];
  }
}
