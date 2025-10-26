# Architecture Map

This guide visualizes how the main packages in the Kali Linux Portfolio relate to each other and the direction imports typically travel.

## Package graph

```mermaid
%% High-level package map with relative links for quick navigation.
graph LR
  classDef entry fill:#312e81, color:#f8fafc, stroke:#6366f1, stroke-width:1px;
  classDef shell fill:#0f172a, color:#e0f2fe, stroke:#38bdf8, stroke-width:1px;
  classDef resource fill:#1f2937, color:#fef9c3, stroke:#fbbf24, stroke-width:1px;

  subgraph Entry_Points
    pagesDir["pages/\nRoutes & API stubs"]:::entry
    appDir["app/\nRoute handlers"]:::entry
  end

  subgraph UI_Shell
    componentsDir["components/\nDesktop shell & shared UI"]:::shell
    componentsAppsDir["components/apps/\nWindow wrappers"]:::shell
    stylesDir["styles/\nGlobal stylesheets"]:::shell
  end

  subgraph Feature_Modules
    appsDir["apps/\nFeature bundles"]:::shell
    hooksDir["hooks/\nState & platform hooks"]:::shell
    utilsDir["utils/\nShared utilities"]:::shell
    modulesDir["modules/\nDomain metadata"]:::shell
    dataDir["data/\nStatic datasets"]:::resource
    workersDir["workers/\nWeb workers"]:::resource
    publicDir["public/\nStatic assets"]:::resource
  end

  pagesDir --> componentsDir
  pagesDir --> hooksDir
  pagesDir --> utilsDir
  pagesDir --> stylesDir
  pagesDir --> dataDir
  appDir --> utilsDir

  componentsDir --> componentsAppsDir
  componentsDir --> hooksDir
  componentsDir --> utilsDir
  componentsDir --> modulesDir
  componentsDir --> dataDir
  componentsDir --> publicDir

  componentsAppsDir --> appsDir
  componentsAppsDir --> hooksDir
  componentsAppsDir --> utilsDir
  componentsAppsDir --> modulesDir
  componentsAppsDir --> dataDir
  componentsAppsDir --> publicDir

  appsDir --> hooksDir
  appsDir --> utilsDir
  appsDir --> modulesDir
  appsDir --> dataDir
  appsDir --> workersDir
  appsDir --> publicDir
  appsDir -.->|UI primitives| componentsDir

  hooksDir --> utilsDir
  utilsDir -.->|Dynamic loaders| componentsDir

  click pagesDir "../pages" "pages/ directory" "_self"
  click appDir "../app" "app/ directory" "_self"
  click componentsDir "../components" "components/ directory" "_self"
  click componentsAppsDir "../components/apps" "components/apps/ directory" "_self"
  click stylesDir "../styles" "styles/ directory" "_self"
  click appsDir "../apps" "apps/ directory" "_self"
  click hooksDir "../hooks" "hooks/ directory" "_self"
  click utilsDir "../utils" "utils/ directory" "_self"
  click modulesDir "../modules" "modules/ directory" "_self"
  click dataDir "../data" "data/ directory" "_self"
  click workersDir "../workers" "workers/ directory" "_self"
  click publicDir "../public" "public/ directory" "_self"
```

### Reading the diagram

- **Solid arrows** show the primary direction of imports. For example, the desktop shell in [`components/`](../components) pulls UI state from [`hooks/`](../hooks) and helpers from [`utils/`](../utils).
- **Dashed arrows** capture notable cross-dependencies, such as reusable UI primitives that the feature bundles in [`apps/`](../apps) import back from the shared component library.
- Each node is clickable so you can jump straight to the folder in the repository from GitHub, local Markdown viewers, or the docs site.

### Rendering support

Mermaid diagrams are parsed and rendered in both GitHub's Markdown renderer and the in-app documentation viewer. If you add additional diagrams, simply use a fenced <code>```mermaid</code> block and the runtime will initialize them automatically.
