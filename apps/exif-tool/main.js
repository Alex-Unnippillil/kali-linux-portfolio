const fileInput = document.getElementById('fileInput');
const metaDiv = document.getElementById('meta');
const sizesDiv = document.getElementById('sizes');
const downloadBtn = document.getElementById('downloadBtn');
const messageDiv = document.getElementById('message');
const downloadLink = document.getElementById('downloadLink');

let currentFile = null;

function formatValue(val) {
  if (Array.isArray(val)) return val.join(', ');
  return val;
}

function gpsToDecimal(gps, ref) {
  const [deg, min, sec] = gps;
  let dec = deg + min / 60 + sec / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  metaDiv.innerHTML = '';
  sizesDiv.textContent = '';
  messageDiv.textContent = '';
  downloadBtn.disabled = true;
  if (!file) return;
  currentFile = file;
  sizesDiv.textContent = `Original file size: ${(file.size / 1024).toFixed(2)} KB`;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const tags = EXIF.readFromBinaryFile(e.target.result);
      const entries = Object.entries(tags);
      if (entries.length === 0) {
        metaDiv.textContent = 'No EXIF metadata found.';
      } else {
        entries.forEach(([key, val]) => {
          if (key === 'GPSLatitude' || key === 'GPSLongitude') return;
          const div = document.createElement('div');
          div.textContent = `${key}: ${formatValue(val)}`;
          metaDiv.appendChild(div);
        });
        if (tags.GPSLatitude && tags.GPSLongitude) {
          const lat = gpsToDecimal(tags.GPSLatitude, tags.GPSLatitudeRef);
          const lon = gpsToDecimal(tags.GPSLongitude, tags.GPSLongitudeRef);
          const gpsDiv = document.createElement('div');
          gpsDiv.innerHTML = `GPS: <span class="highlight">${lat.toFixed(6)}, ${lon.toFixed(6)}</span>`;
          metaDiv.appendChild(gpsDiv);
        }
      }
      downloadBtn.disabled = false;
    } catch (err) {
      metaDiv.textContent = 'Failed to read EXIF data.';
    }
  };
  reader.readAsArrayBuffer(file);
});

downloadBtn.addEventListener('click', () => {
  if (!currentFile) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        messageDiv.textContent = 'Failed to scrub image.';
        return;
      }
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = `scrubbed-${currentFile.name}`;
      const scrubSize = (blob.size / 1024).toFixed(2);
      sizesDiv.textContent += ` | Scrubbed file size: ${scrubSize} KB`;
      messageDiv.textContent = 'Metadata stripped. Downloading...';
      downloadLink.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, currentFile.type || 'image/jpeg');
  };
  img.src = URL.createObjectURL(currentFile);
});
