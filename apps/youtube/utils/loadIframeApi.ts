let loading = false;
let ready = false;
const callbacks: Array<() => void> = [];

export function loadYouTubeIframeApi(onReady: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const win = window as typeof window & {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (win.YT?.Player) {
    ready = true;
  }

  if (ready) {
    onReady();
    return () => {};
  }

  callbacks.push(onReady);

  if (!loading) {
    loading = true;
    win.onYouTubeIframeAPIReady = () => {
      ready = true;
      const pending = callbacks.splice(0, callbacks.length);
      pending.forEach((cb) => cb());
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.ytApi = 'true';
    document.body.appendChild(script);
  }

  return () => {
    const index = callbacks.indexOf(onReady);
    if (index >= 0) callbacks.splice(index, 1);
  };
}
