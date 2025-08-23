/* eslint-env browser */

const fileInput = document.getElementById('file');
const outputDiv = document.getElementById('output');
const errorDiv = document.getElementById('error');

function showError(message) {
  errorDiv.textContent = message;
  if (message) alert(message);
}

async function handleFile(file) {
  outputDiv.innerHTML = '';
  showError('');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let meta;
    try {
      meta = await pdf.getMetadata();
    } catch (e) {
      showError('Could not read metadata');
      return;
    }

    const info = meta.info || {};
    const xmp = meta.metadata ? meta.metadata.getAll() : {};

    const creators = [];
    if (info.Author) creators.push(info.Author);
    if (info.Creator && info.Creator !== info.Author) creators.push(info.Creator);
    if (xmp['dc:creator']) {
      const c = xmp['dc:creator'];
      if (Array.isArray(c)) creators.push(...c);
      else creators.push(c);
    }

    const timestamps = [];
    if (info.CreationDate || xmp['xmp:CreateDate']) {
      timestamps.push(`Created: ${info.CreationDate || xmp['xmp:CreateDate']}`);
    }
    if (info.ModDate || xmp['xmp:ModifyDate']) {
      timestamps.push(`Modified: ${info.ModDate || xmp['xmp:ModifyDate']}`);
    }

    const fields = [];
    try {
      const fieldObjects = await pdf.getFieldObjects();
      if (fieldObjects) {
        Object.entries(fieldObjects).forEach(([name, objs]) => {
          const value = objs[0].value || '';
          fields.push(`${name}: ${value}`);
        });
      }
    } catch (e) {
      // ignore field errors
    }

    const sections = [];
    if (creators.length) {
      sections.push('<h2>Creators</h2><ul>' + creators.map((c) => `<li>${c}</li>`).join('') + '</ul>');
    }
    if (timestamps.length) {
      sections.push('<h2>Timestamps</h2><ul>' + timestamps.map((t) => `<li>${t}</li>`).join('') + '</ul>');
    }
    if (fields.length) {
      sections.push('<h2>Editable Fields</h2><ul>' + fields.map((f) => `<li>${f}</li>`).join('') + '</ul>');
    }
    outputDiv.innerHTML = sections.join('');
  } catch (err) {
    if (err.name === 'PasswordException' || /encrypted|password/i.test(err.message)) {
      showError('File is encrypted');
    } else {
      showError('Could not read metadata');
    }
  }
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});
