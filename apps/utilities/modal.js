const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalIframe = document.getElementById('modal-iframe');
const closeBtn = document.getElementById('modal-close');
let lastFocused;

function openModal(url, title) {
  lastFocused = document.activeElement;
  modal.classList.remove('hidden');
  modalTitle.textContent = title;
  modalIframe.src = url;
  closeBtn.focus();
  document.addEventListener('keydown', handleKeydown);
}

function closeModal() {
  modal.classList.add('hidden');
  modalIframe.src = '';
  document.removeEventListener('keydown', handleKeydown);
  if (lastFocused) {
    lastFocused.focus();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
  if (e.key === 'Tab') {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

closeBtn.addEventListener('click', closeModal);
window.openModal = openModal;
