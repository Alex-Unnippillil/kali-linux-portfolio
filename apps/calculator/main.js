const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const toggle = document.getElementById('toggle-scientific');
const scientific = document.getElementById('scientific');

toggle.addEventListener('click', () => {
  scientific.classList.toggle('hidden');
});

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value || btn.textContent;

    if (action === 'clear') {
      display.textContent = '';
      return;
    }

    if (action === 'equals') {
      display.textContent = evaluate(display.textContent);
      return;
    }

    display.textContent += value;
  });
});

function evaluate(expression) {
  try {
    return Function('with (Math) { return (' + expression + ') }')();
  } catch (e) {
    return 'Error';
  }
}
