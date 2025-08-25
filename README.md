## Adding New Apps

Heavy applications should be loaded with [`next/dynamic`](https://nextjs.org/docs/advanced-features/dynamic-import) so that they do not bloat the initial bundle.

```js
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';

const MyApp = dynamic(() =>
    import('./components/apps/my-app').then(mod => {
        ReactGA.event({ category: 'Application', action: 'Loaded My App' });
        return mod.default;
    }), {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
                Loading My App...
            </div>
        ),
    }
);

const displayMyApp = (addFolder, openApp) => (
    <MyApp addFolder={addFolder} openApp={openApp} />
);
```

Add the `displayMyApp` function to `apps.config.js` and reference it in the `apps` array to make the app available to the desktop.

## Adding New Games

Games are organized in `apps.config.js` using a `games` array that mirrors the structure of the main `apps` list. Each game entry defines metadata such as an `id`, `title`, `icon`, and the component used to render the game.

To introduce a new game:

1. **Icon** – Add the game's icon to `public/themes/Yaru/apps/` and reference it with a relative path like `./themes/Yaru/apps/my-game.png`.
2. **Dynamic import** – Create the game component in `components/apps/` and load it with `next/dynamic` to keep the initial bundle small:

    ```js
    const MyGame = dynamic(() =>
      import('./components/apps/my-game').then(mod => {
        ReactGA.event({ category: 'Application', action: 'Loaded My Game' });
        return mod.default;
      }), {
        ssr: false,
        loading: () => (
          <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
            Loading My Game...
          </div>
        ),
      }
    );

    const displayMyGame = (addFolder, openApp) => (
      <MyGame addFolder={addFolder} openApp={openApp} />
    );
    ```

3. **Register** – Append the game's configuration object to the `games` array:

    ```js
    games.push({
      id: 'my-game',
      title: 'My Game',
      icon: './themes/Yaru/apps/my-game.png',
      screen: displayMyGame,
    });
    ```

The new game will then appear alongside the other games on the desktop.

## Browser Compatibility

Some applications rely on modern or experimental Web APIs such as Web
Bluetooth or camera access. These features are not available in every
browser or on all platforms. Demos require an explicit user gesture
(like clicking a **Scan** button) before attempting to access hardware.
When a feature is unsupported the interface falls back to a read-only
mock so the experience remains visible without granting device access.

## Privacy

The contact application records only non-PII metadata in Google Analytics.
Submissions trigger an event with `{ category: "contact", action: "submit_success" }`, and the
free-text fields (name, subject, message) are never sent to analytics.

## Required CI Secrets

The GitHub Actions workflow relies on the following secrets configured in the repository settings:

- `NEXT_PUBLIC_TRACKING_ID`
- `NEXT_PUBLIC_SERVICE_ID`
- `NEXT_PUBLIC_TEMPLATE_ID`
- `NEXT_PUBLIC_USER_ID`

These secrets provide the values for the corresponding environment variables during the build step.
