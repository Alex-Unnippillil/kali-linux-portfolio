const input = document.getElementById('input');
const schemaInput = document.getElementById('schema');
const output = document.getElementById('output');
const errors = document.getElementById('errors');
const toYamlBtn = document.getElementById('toYaml');
const toJsonBtn = document.getElementById('toJson');
const validateBtn = document.getElementById('validate');
const downloadBtn = document.getElementById('download');
const themeBtn = document.getElementById('theme-toggle');

const themes = {
  light: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
  dark: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai-sublime.min.css'
};
let currentTheme = 'light';
let lastObject = null;
let lastType = 'json';

function highlight(code, lang) {
  output.textContent = code;
  output.className = 'hljs ' + lang;
  if (window.hljs) {
    window.hljs.highlightElement(output);
  }
}

function showError(msg) {
  errors.textContent = msg;
}

function clearError() {
  errors.textContent = '';
}

toYamlBtn.addEventListener('click', () => {
  clearError();
  try {
    const obj = JSON.parse(input.value);
    lastObject = obj;
    lastType = 'yaml';
    const yaml = jsyaml.dump(obj);
    highlight(yaml, 'yaml');
  } catch (e) {
    showError(e.message);
  }
});

toJsonBtn.addEventListener('click', () => {
  clearError();
  try {
    const obj = jsyaml.load(input.value);
    lastObject = obj;
    lastType = 'json';
    const json = JSON.stringify(obj, null, 2);
    highlight(json, 'json');
  } catch (e) {
    showError(e.message);
  }
});

validateBtn.addEventListener('click', () => {
  clearError();
  try {
    const schemaText = schemaInput.value.trim();
    if (!schemaText) {
      showError('Schema input is empty');
      return;
    }
    const schema = JSON.parse(schemaText);
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(lastObject);
    if (valid) {
      showError('Valid!');
    } else {
      showError(ajv.errorsText(validate.errors));
    }
  } catch (e) {
    showError(e.message);
  }
});

downloadBtn.addEventListener('click', () => {
  if (!output.textContent) return;
  const blob = new Blob([output.textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = lastType === 'json' ? 'output.json' : 'output.yaml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

themeBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.getElementById('hljs-theme').href = themes[currentTheme];
  document.body.classList.toggle('dark', currentTheme === 'dark');
});

// initial highlight
highlight('', 'json');
