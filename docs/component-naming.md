# Component Naming Conventions

To keep the codebase consistent and accessible, new components should follow these guidelines:

- **PascalCase** for React component names and their file names (e.g., `TaskbarMenu.tsx`).
- **Suffix `Menu`** for components that render a context menu.
- **Hooks** begin with `use` and use camelCase (e.g., `useFocusTrap`).
- **ARIA labels**: interactive icons, notifications, and context menus must provide an `aria-label` or `aria-labelledby`.
- **File structure** mirrors component structure; each major component resides in its own file.

These conventions help ensure future additions remain readable and screen‑reader friendly.
