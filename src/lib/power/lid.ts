export type LidAction =
  | 'nothing'
  | 'turn-off-display'
  | 'suspend'
  | 'hibernate'
  | 'lock-screen';

let overlay: HTMLDivElement | null = null;

function removeOverlay() {
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.addEventListener(
    'transitionend',
    () => {
      overlay?.remove();
      overlay = null;
    },
    { once: true }
  );
}

export function turnOffDisplay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'screen-off-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'black';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.5s ease';
  document.body.appendChild(overlay);
  // trigger fade in
  requestAnimationFrame(() => {
    if (overlay) overlay.style.opacity = '1';
  });
  const restore = () => {
    window.removeEventListener('keydown', restore);
    window.removeEventListener('mousemove', restore);
    window.removeEventListener('click', restore);
    removeOverlay();
  };
  window.addEventListener('keydown', restore);
  window.addEventListener('mousemove', restore);
  window.addEventListener('click', restore);
}

export function suspend() {
  // Placeholder for suspend functionality
  console.log('Suspend requested');
}

export function hibernate() {
  // Placeholder for hibernate functionality
  console.log('Hibernate requested');
}

export function lockScreen() {
  window.dispatchEvent(new CustomEvent('lock-screen'));
}

export function doNothing() {
  // intentionally empty
}

export function handleLidAction(action: LidAction) {
  switch (action) {
    case 'nothing':
      doNothing();
      break;
    case 'turn-off-display':
      turnOffDisplay();
      break;
    case 'suspend':
      suspend();
      break;
    case 'hibernate':
      hibernate();
      break;
    case 'lock-screen':
      lockScreen();
      break;
    default:
      doNothing();
  }
}
