import figlet from 'figlet';

const fontPaths = {
  Standard: new URL('./fonts/Standard.flf', import.meta.url).href,
  Slant: new URL('./fonts/Slant.flf', import.meta.url).href,
};

const loadedFonts = {};

export const fonts = Object.keys(fontPaths);

export async function loadFont(name) {
  if (!loadedFonts[name]) {
    const res = await fetch(fontPaths[name]);
    const text = await res.text();
    figlet.parseFont(name, text);
    loadedFonts[name] = true;
  }
}
