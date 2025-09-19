export const isEditableElement = (target: EventTarget | null): boolean => {
  if (!target || typeof Element === 'undefined') return false;
  if (!(target instanceof Element)) return false;

  if (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') !== 'false') {
    return true;
  }

  const editable = typeof target.closest === 'function'
    ? target.closest('input, textarea, [contenteditable]')
    : null;
  if (!editable) {
    return false;
  }
  if (editable instanceof HTMLTextAreaElement) {
    return !editable.readOnly && !editable.disabled;
  }
  if (editable instanceof HTMLInputElement) {
    if (editable.readOnly || editable.disabled) return false;
    const type = editable.type ? editable.type.toLowerCase() : 'text';
    const nonTextTypes = new Set([
      'button',
      'checkbox',
      'color',
      'date',
      'datetime-local',
      'file',
      'hidden',
      'image',
      'month',
      'radio',
      'range',
      'reset',
      'submit',
      'time',
      'week',
    ]);
    return !nonTextTypes.has(type);
  }
  return editable.hasAttribute('contenteditable');
};
