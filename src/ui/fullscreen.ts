interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

interface FullscreenElement extends Element {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

export function toggleFullscreen(target?: Element | null) {
  if (typeof document === 'undefined') {
    return;
  }

  const doc = document as FullscreenDocument;

  const fullscreenElement =
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement;

  if (fullscreenElement) {
    const exitFullscreen =
      doc.exitFullscreen ??
      doc.webkitExitFullscreen ??
      doc.mozCancelFullScreen ??
      doc.msExitFullscreen;

    exitFullscreen?.call(doc);
    return;
  }

  const element = (target ?? doc.documentElement) as FullscreenElement | null;

  if (!element) {
    return;
  }

  const requestFullscreen =
    element.requestFullscreen ??
    element.webkitRequestFullscreen ??
    element.mozRequestFullScreen ??
    element.msRequestFullscreen;

  requestFullscreen?.call(element);
}
