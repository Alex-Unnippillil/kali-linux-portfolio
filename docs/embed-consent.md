# Embedded media consent controls

The portfolio ships with simulated tools that depend on external services (for example, StackBlitz or Twitter embeds). These integrations are now opt-in to reduce unsolicited tracking. By default, third-party frames and script embeds are blocked until the visitor explicitly opts in.

## How consent works

- A banner appears on first load to explain why embedded content is disabled and to provide a quick toggle to enable it.
- Individual embeds (tweets, external frames, etc.) include inline prompts. Visitors can load a single embed once or turn on embedded media globally.
- Preferences are stored client-side in `localStorage` under the `allow-embeds` key and respected across reloads. Dismissing the banner only lasts for the current session unless embeds are enabled.

## Updating the preference manually

From within the desktop UI, open the **Settings** app and enable **Allow Embedded Media** under the accessibility and privacy controls. Disabling the toggle immediately stops new embeds from loading while keeping existing windows untouched until refresh.

For automated tests or scripted demos you can seed the preference by setting `window.localStorage.setItem('allow-embeds', 'true')` before bootstrapping the desktop.

## Per-embed overrides

Each embed component checks the global setting before fetching remote code. Visitors who prefer not to enable all embeds can choose **Load once** directly within the component. This performs a one-time fetch without modifying persistent storage.

## Adding new embeds

When introducing new components that load remote scripts or frames:

1. Import `useSettings` and honor the `allowEmbeds` flag before starting any network request.
2. Provide a fallback UI with buttons to "Always allow embeds" (calling `setAllowEmbeds(true)`) and "Load once" (local state only).
3. Avoid prefetching or injecting scripts prior to consent, and document any additional data collection the provider performs.

Following this pattern keeps third-party integrations aligned with privacy expectations and legal requirements for explicit consent.
