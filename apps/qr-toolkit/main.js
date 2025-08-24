const textInput = document.getElementById('text-input');
const ecSelect = document.getElementById('ec-level');
const sizeSlider = document.getElementById('size-slider');
const sizeValue = document.getElementById('size-value');
const errorMsg = document.getElementById('error-msg');
const downloadPngBtn = document.getElementById('download-png-btn');
const downloadSvgBtn = document.getElementById('download-svg-btn');
const qrCanvas = document.getElementById('qr-canvas');
const decodeCanvas = document.getElementById('decode-canvas');
const decodedText = document.getElementById('decoded-text');
const fileInput = document.getElementById('file-input');
const logoInput = document.getElementById('logo-input');
const copyDecodedBtn = document.getElementById('copy-decoded-btn');

const { BrowserQRCodeReader, QRCodeWriter, BarcodeFormat, EncodeHintType, ErrorCorrectionLevel } = ZXing;

const MAX_TEXT_LENGTH = 1000;
let svgData = '';
let debounceTimer;
let logoImg = null;
let logoDataUrl = '';
let currentMatrix = null;

function getQuietZone(matrix) {
  const size = matrix.getWidth();
  for (let x = 0; x < size; x++) {
    if (matrix.get(x, 0)) {
      return x;
    }
  }
  return 0;
}

function renderMatrixToCanvas(matrix, canvas, showGuide = false) {
  const size = matrix.getWidth();
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const v = matrix.get(x, y) ? 0 : 255;
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  if (logoImg) {
    const logoSize = size * 0.2;
    const dx = (size - logoSize) / 2;
    const dy = (size - logoSize) / 2;
    ctx.drawImage(logoImg, dx, dy, logoSize, logoSize);
  }

  if (showGuide) {
    const qz = getQuietZone(matrix);
    ctx.strokeStyle = '#888';
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(qz, qz, size - 2 * qz, size - 2 * qz);
    ctx.setLineDash([]);
  }
}

function matrixToSVG(matrix) {
  const size = matrix.getWidth();
  let path = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.get(x, y)) {
        path += `M${x},${y}h1v1h-1z `;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/><path d="${path.trim()}" fill="#000"/></svg>`;
}

function generate() {
  const text = textInput.value.trim();
  if (!text) {
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    svgData = '';
    currentMatrix = null;
    return;
  }
  const size = parseInt(sizeSlider.value, 10);
  const writer = new QRCodeWriter();
  const hints = new Map();
  hints.set(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel[ecSelect.value]);
  hints.set(EncodeHintType.MARGIN, 4);

  const matrix = writer.encode(text, BarcodeFormat.QR_CODE, size, size, hints);
  currentMatrix = matrix;

  renderMatrixToCanvas(matrix, qrCanvas, true);

  let svg = matrixToSVG(matrix);
  if (logoImg && logoDataUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const logoSize = size * 0.2;
    const imgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
    imgEl.setAttribute('width', logoSize);
    imgEl.setAttribute('height', logoSize);
    imgEl.setAttribute('x', (size - logoSize) / 2);
    imgEl.setAttribute('y', (size - logoSize) / 2);
    imgEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href', logoDataUrl);
    doc.documentElement.appendChild(imgEl);
    const serializer = new XMLSerializer();
    svg = serializer.serializeToString(doc);
  }
  svgData = svg;
}

function debouncedGenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generate, 300);
}

function downloadPNG() {
  if (!currentMatrix) return;
  const canvas = document.createElement('canvas');
  renderMatrixToCanvas(currentMatrix, canvas, false);
  const link = document.createElement('a');
  link.download = 'qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadSVG() {
  if (!svgData) return;
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.download = 'qr.svg';
  link.href = URL.createObjectURL(blob);
  link.click();
}

function handleInput() {
  if (textInput.value.length > MAX_TEXT_LENGTH) {
    errorMsg.textContent = `Text exceeds ${MAX_TEXT_LENGTH} characters`;
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    svgData = '';
    currentMatrix = null;
    return;
  }
  errorMsg.textContent = '';
  debouncedGenerate();
}

const codeReader = new BrowserQRCodeReader();

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = async function () {
    decodeCanvas.width = img.width;
    decodeCanvas.height = img.height;
    const ctx = decodeCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try {
      const result = await codeReader.decodeFromImage(img);
      decodedText.textContent = result.getText();
      const points = result.getResultPoints();
      if (points && points.length > 0) {
        const xs = points.map(p => p.getX());
        const ys = points.map(p => p.getY());
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        ctx.strokeStyle = '#888';
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);
      }
    } catch {
      decodedText.textContent = 'No QR code found';
    }
  };
  img.src = URL.createObjectURL(file);
}

function handleLogo(event) {
  const file = event.target.files[0];
  if (!file) {
    logoImg = null;
    logoDataUrl = '';
    generate();
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      logoImg = img;
      logoDataUrl = e.target.result;
      generate();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

copyDecodedBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(decodedText.textContent || '');
});

textInput.addEventListener('input', handleInput);
ecSelect.addEventListener('change', handleInput);
sizeSlider.addEventListener('input', () => {
  sizeValue.textContent = sizeSlider.value;
  handleInput();
});
downloadPngBtn.addEventListener('click', downloadPNG);
downloadSvgBtn.addEventListener('click', downloadSVG);
fileInput.addEventListener('change', handleFile);
logoInput.addEventListener('change', handleLogo);

generate();
