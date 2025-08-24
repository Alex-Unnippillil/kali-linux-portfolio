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


const MAX_TEXT_LENGTH = 1000;
let svgData = '';
let debounceTimer;
let logoImg = null;
let logoDataUrl = '';

function generate() {
  const text = textInput.value.trim();
  if (!text) {
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    svgData = '';
    return;
  }
  const size = parseInt(sizeSlider.value, 10);
  QRCode.toCanvas(
    qrCanvas,
    text,
    {
      errorCorrectionLevel: ecSelect.value,
      width: size,
      color: { dark: fgColor.value, light: bgColor.value },
    },
    (err) => {
      if (err) {
        console.error(err);
      } else if (logoImg) {
        const ctx = qrCanvas.getContext('2d');
        const logoSize = size * 0.2;
        const dx = (size - logoSize) / 2;
        const dy = (size - logoSize) / 2;
        ctx.drawImage(logoImg, dx, dy, logoSize, logoSize);
      }
    }
  );
  QRCode.toString(
    text,
    {
      errorCorrectionLevel: ecSelect.value,
      width: size,
      type: 'svg',
      color: { dark: fgColor.value, light: bgColor.value },
    },
    (err, svg) => {
      if (!err) {
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
          svgData = serializer.serializeToString(doc);
        } else {
          svgData = svg;
        }
      }
    }
  );
}

function debouncedGenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generate, 300);
}

function downloadPNG() {
  const link = document.createElement('a');
  link.download = 'qr.png';
  link.href = qrCanvas.toDataURL('image/png');
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
    return;
  }
  errorMsg.textContent = '';
  debouncedGenerate();
}

// Decode uploaded image file using canvas and jsQR
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      decodeCanvas.width = img.width;
  decodeCanvas.height = img.height;
  const ctx = decodeCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, decodeCanvas.width, decodeCanvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      decodedText.textContent = code ? code.data : 'No QR code found';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
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

textInput.addEventListener('input', handleInput);
ecSelect.addEventListener('change', handleInput);
sizeSlider.addEventListener('input', () => {
  sizeValue.textContent = sizeSlider.value;
  handleInput();
});
fgColor.addEventListener('input', handleInput);
bgColor.addEventListener('input', handleInput);
downloadPngBtn.addEventListener('click', downloadPNG);
downloadSvgBtn.addEventListener('click', downloadSVG);
fileInput.addEventListener('change', handleFile);
logoInput.addEventListener('change', handleLogo);


// Initial render
generate();
