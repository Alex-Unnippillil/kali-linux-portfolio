import figlet from 'figlet';

const loadedFonts = {};

self.onmessage = async (e) => {
  const { text, font, baseUrl } = e.data;
  if (font && !loadedFonts[font]) {
    const module = await import(
      /* webpackIgnore: true */ `${baseUrl}/${encodeURIComponent(font)}.js?module`
    );
    figlet.parseFont(font, module.default);
    loadedFonts[font] = true;
  }
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage(rendered);
};

