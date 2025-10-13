# Code review: QuickSettings polish

## Overview
The `QuickSettings` panel update introduces richer styling, theme toggles, and persistent preferences. Accessibility and interaction polish are central to this component, so the review focused on keyboard reachability and semantic structure in addition to general UX regressions.

## Findings

### 1. Hidden panel remains focusable when closed (High)
*When the quick settings tray is closed it should be inert, but the current implementation only toggles CSS visibility.* The container sets `aria-hidden={!open}` and disables pointer events, yet all child buttons remain in the document tab order. Keyboard users can still tab into the hidden controls, which is disorienting and violates expected menu behaviour.【F:components/ui/QuickSettings.tsx†L63-L171】 Consider conditionally rendering the panel, applying the `hidden` attribute, or toggling `tabIndex={-1}` on focusable elements while the tray is closed.

### 2. `label` elements target non-labelable buttons (Medium)
The toggle rows wrap their text in a `<label htmlFor={id}>`, but the referenced node is a `<button>`. Buttons are not labelable form controls, so the association is invalid and clicking the text does not toggle the switch as expected. Replace the `label` with a semantic container (e.g., `<div>`/`<span>`) and explicitly wire the button’s accessible name via `aria-labelledby`, or convert the control to a proper checkbox that can be labelled.【F:components/ui/QuickSettings.tsx†L138-L167】

## Recommendation
Address the focus management and labelling issues before merging to avoid regressions in keyboard and assistive technology support.
