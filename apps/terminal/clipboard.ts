export type ClipboardCleanup = () => void;

const isSelectionInsideRoot = (root: HTMLElement, selection: Selection | null) => {
  if (!selection || selection.isCollapsed) return false;
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  const anchorInside = anchor ? root.contains(anchor) : false;
  const focusInside = focus ? root.contains(focus) : false;
  return anchorInside || focusInside;
};

const copySelection = async (selection: Selection | null) => {
  if (!selection) return;
  const text = selection.toString();
  if (!text) return;
  const { clipboard } = navigator;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return;
    } catch (error) {
      // Fallback below.
    }
  }
  try {
    document.execCommand('copy');
  } catch (error) {
    // Swallow errors to avoid interrupting key handling.
  }
};

const dispatchPasteEvent = (root: HTMLElement, text: string) => {
  const event = new CustomEvent<string>('terminal-paste', { detail: text });
  root.dispatchEvent(event);
};

const handlePaste = async (root: HTMLElement) => {
  const { clipboard } = navigator;
  if (clipboard?.readText) {
    try {
      const text = await clipboard.readText();
      dispatchPasteEvent(root, text);
      return;
    } catch (error) {
      // Fallback below.
    }
  }
  dispatchPasteEvent(root, '');
};

export function wireClipboardShortcuts(root: HTMLElement): ClipboardCleanup {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey || !event.shiftKey) return;
    const key = event.key.toLowerCase();

    if (key === 'c') {
      const selection = window.getSelection();
      if (!isSelectionInsideRoot(root, selection)) return;
      event.preventDefault();
      event.stopPropagation();
      void copySelection(selection);
    } else if (key === 'v') {
      event.preventDefault();
      event.stopPropagation();
      void handlePaste(root);
    }
  };

  root.addEventListener('keydown', onKeyDown);
  return () => {
    root.removeEventListener('keydown', onKeyDown);
  };
}
