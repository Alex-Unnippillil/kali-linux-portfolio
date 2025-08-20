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
