(function () {
  const ACCENTS = [
    { name: 'Kali Blue', color: '#1793d1' },
    { name: 'Red', color: '#e53e3e' },
    { name: 'Orange', color: '#d97706' },
    { name: 'Green', color: '#38a169' },
    { name: 'Purple', color: '#805ad5' },
    { name: 'Pink', color: '#ed64a6' },
    { name: 'Kali Purple', color: '#681da8' },
  ];

  const root = document.documentElement;
  const chips = [];

  function setAccent(color) {
    root.style.setProperty('--accent', color);
    root.style.setProperty('--color-accent', color);
    try {
      window.localStorage.setItem('accent', color);
    } catch (err) {}
    chips.forEach((chip) => {
      chip.classList.toggle('selected', chip.dataset.color === color);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const stored = (() => {
      try {
        return window.localStorage.getItem('accent');
      } catch (err) {
        return null;
      }
    })();
    const initial = ACCENTS.find((a) => a.color === stored)?.color || ACCENTS[0].color;

    const container = document.createElement('div');
    container.id = 'accent-chips';
    container.style.display = 'flex';
    container.style.gap = '0.5rem';

    const style = document.createElement('style');
    style.textContent = `
      #accent-chips button {
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        border: 2px solid transparent;
        cursor: pointer;
      }
      #accent-chips button.selected {
        border-color: #ffffff;
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);

    ACCENTS.forEach(({ name, color }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.style.background = color;
      chip.dataset.color = color;
      chip.setAttribute('aria-label', `select-accent-${name}`);
      chip.addEventListener('click', () => setAccent(color));
      container.appendChild(chip);
      chips.push(chip);
    });

    document.body.appendChild(container);
    setAccent(initial);
  });
})();
