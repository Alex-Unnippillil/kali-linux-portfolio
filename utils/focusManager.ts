export const blurActiveElement = () => {
  if (typeof document === 'undefined') return;
  const activeElement = document.activeElement;
  if (activeElement && activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
};
