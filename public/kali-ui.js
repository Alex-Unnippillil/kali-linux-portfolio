/* eslint-env browser */
(function () {
  var THEME_KEY = 'app:theme';
  var CONTRAST_KEY = 'high-contrast';
  var ACCENT_KEY = 'accent';
  var darkThemes = ['dark', 'neon', 'matrix'];

  function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16);
    var t = percent < 0 ? 0 : 255;
    var p = Math.abs(percent);
    var R = f >> 16;
    var G = (f >> 8) & 0x00ff;
    var B = f & 0x0000ff;
    var newR = Math.round((t - R) * p) + R;
    var newG = Math.round((t - G) * p) + G;
    var newB = Math.round((t - B) * p) + B;
    return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1);
  }

  function applyAccent(accent) {
    if (!accent) return;
    var border = shadeColor(accent, -0.2);
    var vars = {
      '--color-ub-orange': accent,
      '--color-ub-border-orange': border,
      '--color-primary': accent,
      '--color-accent': accent,
      '--color-focus-ring': accent,
      '--color-selection': accent,
      '--color-control-accent': accent,
    };
    Object.keys(vars).forEach(function (key) {
      document.documentElement.style.setProperty(key, vars[key]);
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && e.newValue) {
      document.documentElement.dataset.theme = e.newValue;
      document.documentElement.classList.toggle('dark', darkThemes.includes(e.newValue));
    }
    if (e.key === CONTRAST_KEY) {
      document.documentElement.classList.toggle('high-contrast', e.newValue === 'true');
    }
    if (e.key === ACCENT_KEY && e.newValue) {
      applyAccent(e.newValue);
    }
  });
})();
