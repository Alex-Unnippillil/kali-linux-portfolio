const palette = {
  info: { base: '#0072B2', accent: '#004B7C', contrast: '#F2F8FF' },
  success: { base: '#007F5F', accent: '#005D44', contrast: '#F5FDF8' },
  warning: { base: '#E69F00', accent: '#B87400', contrast: '#1A1200' },
  danger: { base: '#D55E00', accent: '#953F00', contrast: '#1A0A00' },
  neutral: { base: '#7F7F7F', accent: '#5A5A5A', contrast: '#111111' },
};

const deficiencyMatrices = {
  protanopia: [
    [0.56667, 0.43333, 0],
    [0.55833, 0.44167, 0],
    [0, 0.24167, 0.75833],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.43333, 0.56667],
    [0, 0.475, 0.525],
  ],
};

function hexToRgb(hex) {
  const normalized = hex.replace('#', '').trim();
  const value = normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized;
  const intVal = parseInt(value, 16);
  return [16, 8, 0].map((shift) => (intVal >> shift) & 0xff);
}

function rgbToHex(rgb) {
  const hex = rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex.toUpperCase()}`;
}

function applyMatrix(rgb, matrix) {
  const [r, g, b] = rgb.map((c) => c / 255);
  const transformed = [
    r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2],
    r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2],
    r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2],
  ];
  return transformed.map((value) => Math.min(Math.max(value, 0), 1) * 255);
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255);
  const linear = [r, g, b].map((value) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const [tone, values] of Object.entries(palette)) {
  const ratio = contrastRatio(values.base, values.contrast);
  console.log(`\n${tone.toUpperCase()}`);
  console.log(` Base ${values.base} vs text ${values.contrast} → contrast ${ratio.toFixed(2)}:1`);
  for (const [deficiency, matrix] of Object.entries(deficiencyMatrices)) {
    const simulated = rgbToHex(applyMatrix(hexToRgb(values.base), matrix));
    const simulatedRatio = contrastRatio(simulated, values.contrast);
    console.log(`  ${deficiency.padEnd(12)} ${simulated} (contrast ${simulatedRatio.toFixed(2)}:1)`);
  }
}

console.log('\nValidation complete. Ratios ≥ 4.50:1 meet WCAG AA for normal text.');
