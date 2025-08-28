import figlet from 'figlet';

// Use CDN hosted fonts so the full list is available in the browser
figlet.defaults({ fontPath: 'https://unpkg.com/figlet/fonts' });

// Load the full font list from the CDN directory listing
async function loadFonts() {
  try {
    const res = await fetch('https://unpkg.com/figlet/fonts?meta');
    const meta = await res.json();
    const fonts = meta.files
      .filter((f) => f.path.endsWith('.flf'))
      .map((f) => f.path.replace('/fonts/', '').replace('.flf', ''));
    self.postMessage({ type: 'fonts', fonts });
  } catch (err) {
    // Fallback to a basic font if the request fails
    self.postMessage({ type: 'fonts', fonts: ['Standard'] });
  }
}

loadFonts();

// Render figlet output whenever the main thread sends new text/font
self.onmessage = (e) => {
  const { text, font } = e.data;
  figlet.text(text || '', { font }, (_err, output = '') => {
    self.postMessage({ type: 'render', output });
  });
};
