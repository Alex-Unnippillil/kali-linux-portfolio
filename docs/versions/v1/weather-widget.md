# Weather Widget Notes

The Weather Widget is a compact companion to the full Weather utility. It shares
the same Open-Meteo data source, respects global settings, and gracefully falls
back to bundled demo data when live calls are unavailable.

## Data flow

- **Provider** – Uses the `fetchWeather('openMeteo', …)` helper to request
  current conditions and a five-day forecast. The widget performs a lightweight
  geocoding lookup before the forecast request so users can search by city.
- **Caching** – Responses are cached through the Service Worker `caches` API so
  repeat views work offline and refreshes are instant when data is warm.
- **Fallback** – If `allowNetwork` is disabled or a fetch fails, the widget
  displays the `apps/weather_widget/demoCity.json` snapshot instead of throwing
  an error.

## Settings integration

The widget consumes the desktop-wide settings context and responds to these
flags:

| Setting                | Behavior                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `allowNetwork`         | Gates geocoding + weather requests. When disabled, the widget
|                        | surfaces a notice and serves demo data.                          |
| `reducedMotion`        | Disables icon animations so motion-sensitive users avoid extra
|                        | movement.                                                        |
| `largeHitAreas`        | Expands input/button hit targets to at least 44px for touch.     |

The widget also persists user preferences with `safeLocalStorage` so they carry
between sessions:

| Storage key      | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `weatherUnit`    | Temperature unit (`metric` / `imperial`). |
| `savedCities`    | Autocomplete list for the search input.   |
| `lastCity`       | Most recently viewed city.                |
| `pinnedCity`     | Sticky city shown on load and in the Pin toggle. |

## UI quick reference

- **Search** – Text field with datalist suggestions sourced from `savedCities`.
- **Units** – Dropdown toggling Celsius ↔ Fahrenheit with instant UI updates.
- **Actions** – Update (submit), Refresh (force re-fetch), and Pin/Unpin (toggle
  persistence) buttons.
- **Summary** – Current temperature, feels-like reading, condition label, and
  sunrise/sunset times.
- **Forecast** – Five-day outlook rendered with the shared `WeatherIcon`
  component for consistency with the full app.

## Accessibility

- Form inputs and buttons are labeled, use `aria-live` regions for status
  updates, and group the current conditions with `role="group"` so screen
  readers announce context.
- The layout collapses gracefully for narrow viewports and honors the
  high-contrast accent palette automatically via CSS custom properties.

Keep this document updated when new settings, storage keys, or external
providers are introduced.
