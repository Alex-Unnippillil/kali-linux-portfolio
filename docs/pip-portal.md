# Pip Portal

The `PipPortal` component provides a simple API for rendering React
content inside a [Document Picture-in-Picture](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API) window.

## Usage

Wrap your application with `PipPortalProvider` and use the `usePipPortal`
hook to open or close the PiP window.

```tsx
import PipPortalProvider, { usePipPortal } from '../components/PipPortal';

function HudButton() {
  const { open, close } = usePipPortal();

  return (
    <div>
      <button
        onClick={() =>
          open(<div className="p-2">Timer: 00:30</div>)
        }
      >
        Show Timer
      </button>
      <button onClick={close}>Close</button>
    </div>
  );
}

// in _app.jsx
export default function App({ Component, pageProps }) {
  return (
    <PipPortalProvider>
      <Component {...pageProps} />
    </PipPortalProvider>
  );
}
```

The PiP window persists as long as the tab is open and automatically
closes on the `pagehide` event.  
You can mount timers, heads-up displays or other widgets into this portal
to keep them visible while the user navigates the site.

