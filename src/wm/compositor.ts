export interface CompositorSettings {
  css: boolean;
  webgl: boolean;
}

const DEFAULT_SETTINGS: CompositorSettings = {
  css: true,
  webgl: true,
};

const STORAGE_KEY = 'wm-compositor-settings';

let current: CompositorSettings = { ...DEFAULT_SETTINGS };

export function loadCompositor(): CompositorSettings {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        current = { ...current, ...JSON.parse(stored) };
      }
    } catch {
      // ignore parse errors
    }
    applySettings();
  }
  return current;
}

export function updateCompositor(partial: Partial<CompositorSettings>) {
  current = { ...current, ...partial };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // ignore storage errors
    }
    applySettings();
  }
}

function applySettings() {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.toggle('compositor-css-disabled', !current.css);
  const id = 'wm-compositor-canvas';
  let canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (current.webgl) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = id;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      document.body.appendChild(canvas);
    }
    const gl = canvas.getContext('webgl');
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  } else if (canvas) {
    canvas.remove();
  }
}

export function getCompositor(): CompositorSettings {
  return current;
}
