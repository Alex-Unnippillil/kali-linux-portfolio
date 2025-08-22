const textInput = document.getElementById('text-input');
const ecSelect = document.getElementById('ec-level');
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const qrCanvas = document.getElementById('qr-canvas');
const decodeCanvas = document.getElementById('decode-canvas');
const decodedText = document.getElementById('decoded-text');
const fileInput = document.getElementById('file-input');

// Generate QR code with selected error correction level
function generate() {
  const text = textInput.value.trim();
  if (!text) return;
  QRCode.toCanvas(
    qrCanvas,
    text,
    { errorCorrectionLevel: ecSelect.value, width: 256 },
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );
}

// Download generated QR code as image
function download() {
  const link = document.createElement('a');
  link.download = 'qr.png';
  link.href = qrCanvas.toDataURL('image/png');
  link.click();
}

// Decode uploaded image file using jsQR
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

generateBtn.addEventListener('click', generate);
downloadBtn.addEventListener('click', download);
fileInput.addEventListener('change', handleFile);
