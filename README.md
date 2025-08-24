## Setup

1. Copy `.env.example` to `.env.local`.
2. In `.env.local`, set `JWT_SECRET` to a secure value; this variable is required.
3. Optionally set analytics variables such as `NEXT_PUBLIC_ENABLE_ANALYTICS` and `NEXT_PUBLIC_TRACKING_ID`.
4. Update `.env.example` whenever new environment variables are added.

## Adding New Apps

See [New App Checklist](./docs/new-app-checklist.md) to ensure all required steps are completed.

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
            <div className="h-full w-full flex items-center justify-center bg-panel text-white">
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

### Minimal Example

1. **Create the component** in `components/apps/hello.tsx`:

```tsx
export default function Hello() {
  return <div className="p-4">Hello world!</div>;
}
```

2. **Register it** in `apps.config.js` with [`next/dynamic`](https://nextjs.org/docs/advanced-features/dynamic-import):

```js
import dynamic from 'next/dynamic';

const HelloApp = dynamic(() => import('./components/apps/hello'), { ssr: false });

const displayHello = (addFolder, openApp) => (
  <HelloApp addFolder={addFolder} openApp={openApp} />
);

apps.push({
  id: 'hello',
  title: 'Hello',
  icon: './themes/Yaru/apps/hello.png',
  screen: displayHello,
});
```

Keep new apps client-side only. If realtime or server-like features are needed, rely on a provider-based solution instead of adding backend logic.

## Adding New Games

Games are organized in `apps.config.js` using a `games` array that mirrors the structure of the main `apps` list. Each game entry defines metadata such as an `id`, `title`, `icon`, and the component used to render the game.

To introduce a new game:

1. **Icon** – Add the game's icon to `public/themes/Yaru/apps/` and reference it with the helper `icon('my-game.png')`.
2. **Dynamic import** – Create the game component in `components/apps/` and load it with `next/dynamic` to keep the initial bundle small:

    ```js
    const MyGame = dynamic(() =>
      import('./components/apps/my-game').then(mod => {
        ReactGA.event({ category: 'Application', action: 'Loaded My Game' });
        return mod.default;
      }), {
        ssr: false,
        loading: () => (
          <div className="h-full w-full flex items-center justify-center bg-panel text-white">
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
      icon: icon('my-game.png'),
      screen: displayMyGame,
    });
    ```

The new game will then appear alongside the other games on the desktop.

## Theme Selection

Icon themes can be changed at runtime by setting the `NEXT_PUBLIC_THEME`
environment variable. It should correspond to a directory inside
`public/themes/`. When unspecified, the application defaults to the
`Yaru` theme.

## Privacy

The contact application records only non-PII metadata in Google Analytics.
Submissions trigger an event with `{ category: "contact", action: "submit_success" }`, and the
free-text fields (name, subject, message) are never sent to analytics.

## Required CI Secrets

The GitHub Actions workflow relies on the following secrets configured in the repository settings:

- `NEXT_PUBLIC_ENABLE_ANALYTICS` (optional)
- `NEXT_PUBLIC_TRACKING_ID`
- `NEXT_PUBLIC_SERVICE_ID`
- `NEXT_PUBLIC_TEMPLATE_ID`
- `NEXT_PUBLIC_USER_ID`
- `NEXT_PUBLIC_AXIOM_TOKEN`
- `NEXT_PUBLIC_AXIOM_DATASET`

These secrets provide the values for the corresponding environment variables during the build step.

## Deployment and WebSocket Support

The checkers game exposes a Socket.IO endpoint at `/api/checkers/socket`. To run it in
production, deploy the project to a platform that supports Node.js serverless
functions with WebSocket support.

- **Recommended platform:** [Vercel](https://vercel.com/)
- **Runtime:** `nodejs20.x` (Node.js 20 server runtime, not the Edge runtime)
- **Region:** use a WebSocket-enabled region such as `iad1`

Include the runtime and region in `vercel.json` if you need to override
defaults:

```json
{
  "functions": {
    "api/checkers/socket.ts": {
      "runtime": "nodejs20.x",
      "region": "iad1"
    }
  }
}
```

### Troubleshooting

- **Reconnections** – if a client disconnects, Socket.IO will retry
  automatically. Upon reconnection, the client should emit `join` with the
  original `gameId` to resubscribe to the match.
- **Scaling limits** – serverless WebSockets have connection limits per region
  and may recycle instances under load. For heavy usage, monitor connection
  counts and consider a dedicated WebSocket host or external state store.
=======
## E2E Testing

The project uses [Playwright](https://playwright.dev/) for end-to-end tests.

### Setup

1. Install the Playwright browsers (Chromium is sufficient):
   ```bash
   npx playwright install chromium
   npx playwright install-deps chromium  # on Linux
   ```
2. Run the tests:
   ```bash
   yarn test:e2e
   ```

The Playwright configuration automatically starts the development server before running the tests.

## Deployment

This project relies on Next.js server features such as API routes and Socket.IO websockets. For production deployments, build and run the server:

```bash
yarn build
yarn start
```

Deploy to any platform that can run a Next.js server; static export is not supported.

