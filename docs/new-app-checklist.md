# New App Checklist

Use this checklist when adding a new desktop application.

- [ ] **Run the generator** – `yarn new-app <id>` scaffolds a component and config entry.
- [ ] **Add icon** for the app under `public/themes`.
- [ ] **Define the app** in `apps.config.js`.
- [ ] **Use `createDynamicApp`** to dynamically import the component.
- [ ] **Update the Content Security Policy** if the app loads external resources.
- [ ] **Write a Playwright test** to cover basic behaviour.
