

# Portafolio Kali Linux

Un portafolio con estilo de escritorio construido con Next.js y Tailwind CSS que recrea la apariencia y sensación de una estación de trabajo Kali Linux o Ubuntu. Se entrega con un gestor de ventanas, dock, lanzador, menús contextuales, tematización y un catálogo curado de simulaciones de herramientas de seguridad, utilidades y juegos retro. Este README está destinado a colaboradores, operadores y a cualquiera que ejecute el portafolio en entornos de producción o de vista previa.

Sitio en vivo: https://unnippillil.com/
Repositorio: https://github.com/Alex-Unnippillil/kali-linux-portfolio

## Tabla de contenidos

- [Objetivos del proyecto](#objetivos-del-proyecto)
- [Aviso legal y resumen de riesgos](#aviso-legal-y-resumen-de-riesgos)
- [Qué obtienes](#qué-obtienes)
- [Catálogo de aplicaciones](#catálogo-de-aplicaciones)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Cómo funciona](#cómo-funciona)
  - [Interfaz de escritorio](#interfaz-de-escritorio)
  - [Tiempo de ejecución de apps y carga dinámica](#tiempo-de-ejecución-de-apps-y-carga-dinámica)
  - [Modelo de seguridad basado en simulación](#modelo-de-seguridad-basado-en-simulación)
  - [Modelo de persistencia](#modelo-de-persistencia)
  - [PWA y modo sin conexión](#pwa-y-modo-sin-conexión)
- [Inicio rápido](#inicio-rápido)
- [Configuración](#configuración)
  - [Variables de entorno](#variables-de-entorno)
  - [Banderas de características](#banderas-de-características)
  - [Política de seguridad de contenido (CSP) y encabezados de seguridad](#política-de-seguridad-de-contenido-csp-y-encabezados-de-seguridad)
- [Flujos de trabajo para desarrolladores](#flujos-de-trabajo-para-desarrolladores)
  - [Scripts](#scripts)
  - [Pruebas](#pruebas)
  - [Accesibilidad](#accesibilidad)
  - [Linter y seguridad de tipos](#linter-y-seguridad-de-tipos)
- [Despliegue](#despliegue)
  - [Vercel](#vercel)
  - [Exportación a GitHub Pages](#exportación-a-github-pages)
- [Operaciones](#operaciones)
  - [Analítica](#analítica)
  - [Informes de errores](#informes-de-errores)
- [Contribuir](#contribuir)
- [Registro de cambios y versionado](#registro-de-cambios-y-versionado)
- [Seguridad](#seguridad)
- [Solución de problemas](#solución-de-problemas)
- [Licencia](#licencia)

## Objetivos del proyecto

1. Proveer un portafolio que demuestre profundidad en ingeniería de productos mediante una interfaz de usuario compleja y similar a un sistema operativo.
2. Mantener las herramientas de seguridad como demostrativas y no operativas. El proyecto es seguro para ejecutarse en dispositivos personales y seguro para compartir públicamente.
3. Mantener estrictos controles de calidad: seguridad de tipos, pruebas, revisiones de accesibilidad y encabezados de despliegue seguros por defecto.
4. Mantener la base de código accesible para iteraciones a largo plazo con documentación, listas de verificación y flujos de trabajo repetibles.

## Aviso legal y resumen de riesgos

Este repositorio incluye simulaciones de interfaz inspiradas en herramientas de seguridad comunes. Estas experiencias son exclusivamente para fines educativos, revisión de portafolios y experimentación segura. No adaptes esta base de código para realizar acciones ofensivas reales, intentos de fuerza bruta, escaneos, explotación o cualquier actividad no autorizada.

Si contribuyes con nuevas experiencias de herramientas, deben permanecer como demostraciones autocontenidas. Prefiere datos estáticos (fixtures), conjuntos de datos sin conexión y generación de salida determinista sobre cualquier comportamiento de red real.

## Qué obtienes

### UX de escritorio

- Gestión de ventanas con capacidad de arrastrar, redimensionar, fijar (snapping), foco y manejo de z-index.
- Experiencias de dock y lanzador para organizar aplicaciones y favoritos.
- Menús contextuales y paneles para controles del sistema y notificaciones.
- Tematización y personalización: color de acento, fondo de pantalla, densidad, movimiento, contraste, audio y hápticas.

### Ecosistema de aplicaciones

El catálogo de aplicaciones se define en `apps.config.js` y se implementa principalmente en `components/apps/**`, junto con un pequeño conjunto de módulos especializados en `apps/**`, `modules/**` y `workers/**`.

Las aplicaciones representativas incluyen:

- Productividad y multimedia: Notas, Post-its, YouTube, Spotify, Todoist, Explorador de archivos, Cámara, Grabadora de pantalla.
- Herramientas de desarrollo: Terminal, embed de VSCode, constructores de solicitudes, herramientas ASCII.
- Simulaciones: Wireshark, Kismet, Nessus, Nikto, Recon-ng, Mimikatz, Metasploit (simulado), herramientas de contraseñas (simuladas).
- Juegos: Buscaminas, Snake, Solitario, Tetris, Pacman, Asteroids, Candy Crush, Ajedrez, Damas, Barcos, Tower Defense.

### Seguridad, privacidad y controles

- El acceso a redes externas desde el cliente está protegido por `allowNetwork` en Configuración.
- Las integraciones opcionales están explícitamente controladas por variables de entorno.
- Los despliegues de producción incluyen encabezados de seguridad y restricciones CSP.

## Catálogo de aplicaciones

Todas las aplicaciones se cargan de forma diferida (lazy-loaded) a través de `apps.config.js` para garantizar un rendimiento óptimo en la carga inicial. Las listas a continuación son representativas e incluyen las rutas principales de implementación utilizadas por la interfaz de escritorio o las páginas de constructor.

### Herramientas de seguridad (simulaciones)

Estas herramientas son simulaciones diseñadas con fines educativos. No realizan ataques de red reales.

| App | Detalles de implementación | Ruta principal |
| --- | --- | --- |
| Autopsy | Maqueta de interfaz de forense digital que simula informes de análisis de archivos y navegación de evidencias utilizando datos estáticos. | `components/apps/autopsy` |
| BeEF | Simulación del marco de explotación de navegadores que renderiza un panel de control estático para demostrar la gestión de navegadores comprometidos. | `components/apps/beef` |
| Bluetooth | Simula secuencias de escaneo/emparejamiento de `bluetoothctl` y `hcitool` utilizando listas de dispositivos pregrabadas. | `components/apps/ble-sensor` |
| Dsniff | Simulación de herramienta de auditoría de red que muestra registros estáticos de captura de paquetes y credenciales de ejemplo. | `components/apps/dsniff` |
| Ettercap | Simulación de suite de ataques man-in-the-middle que visualiza listas de hosts y flujos de trabajo de envenenamiento ARP sin paquetes reales. | `components/apps/ettercap` |
| Ghidra | Simulación de suite de ingeniería inversa con análisis de arrastrar y soltar y conexión opcional de descompilador WASM. | `components/apps/ghidra` |
| Hashcat | Simulación de recuperación de contraseñas con barras de progreso y salidas deterministas. | `components/apps/hashcat` |
| Hydra | Simulación de cracker de inicios de sesión con velocidad y configuración de hilos ajustables contra un servicio ficticio. | `components/apps/hydra` |
| John the Ripper | Simulación de cracking de contraseñas fuera de línea con salida estilo terminal. | `components/apps/john` |
| Kismet | Simulación de detector de redes inalámbricas con listas de redes aleatorias. | `components/apps/kismet.jsx` |
| Metasploit | Simulación basada en consola con análisis de comandos, sesiones, trabajos y metadatos de exploits falsos. | `components/apps/metasploit` |
| Metasploit Post | Extensión de módulo de post-explotación para la simulación de Metasploit. | `components/apps/msf-post` |
| Mimikatz | Simulación de herramienta de credenciales con salida determinista para comandos de credenciales y tokens. | `components/apps/mimikatz` |
| Mimikatz Offline | Conjunto de datos de simulación de credenciales sin conexión. | `components/apps/mimikatz/offline` |
| Nessus | Simulación de escáner de vulnerabilidades con informes de panel y gráficos. | `components/apps/nessus` |
| Nikto | Simulación de escáner web con hallazgos predefinidos y metadatos. | `components/apps/nikto` |
| Nmap NSE | Simulación de escaneo con motor de scripts y salidas de servicios deterministas. | `components/apps/nmap-nse` |
| OpenVAS | Simulación de escáner de vulnerabilidades con gestión de tareas y paneles de informes. | `components/apps/openvas` |
| Radare2 | Simulación de consola de ingeniería inversa con salida de desensamblado. | `components/apps/radare2` |
| Reaver | Simulación de fuerza bruta WPS con actualizaciones de progreso y resultados falsos. | `components/apps/reaver` |
| Recon-ng | Simulación de flujo de trabajo OSINT con objetivos ficticios y flujos de módulos. | `components/apps/reconng` |
| Volatility | Simulación de forense de memoria para inspección de imágenes de memoria. | `components/apps/volatility` |
| Wireshark | Simulación de analizador de paquetes con listas y detalles de paquetes virtualizados. | `components/apps/wireshark` |

### Utilidades y productividad

| App | Detalles de implementación | Ruta principal |
| --- | --- | --- |
| About Alex | Ventana de perfil y vista general del portafolio. | `components/apps/alex` |
| ASCII Art | Generador de arte ASCII para salida estilo terminal. | `components/apps/ascii_art` |
| Calculator | Calculadora científica con conversiones de unidades usando `math.js`. | `components/apps/calculator` |
| Camera | Usa `navigator.mediaDevices.getUserMedia` para capturar imágenes localmente. | `components/apps/camera` |
| Contact (Gedit) | Simulación de editor de texto que duplica como formulario de contacto vía EmailJS. | `components/apps/contact` |
| Converter | Convertidor de unidades con definiciones compartidas para longitud, masa, temperatura y más. | `components/apps/converter` |
| Desktop Folder | Ventana de carpeta para elementos y accesos directos del escritorio. | `components/apps/desktop-folder` |
| Evidence Vault | Superficies de almacenamiento y revisión de evidencias para flujos forenses. | `components/apps/evidence-vault` |
| File Explorer | Administrador de archivos con navegación, vista previa y operaciones básicas. | `components/apps/file-explorer` |
| Firefox | Caparazón de navegador basado en iframe con destinos en lista blanca. | `components/apps/firefox` |
| Figlet | Generador de banners ASCII. | `components/apps/figlet` |
| Input Lab | Superficie de prueba y demostración de componentes de entrada. | `components/apps/input-lab` |
| Notepad | Editor de notas ligero. | `components/apps/notepad` |
| Plugin Manager | Catálogo y superficie de gestión de plugins. | `components/apps/plugin-manager` |
| Project Gallery | Galería de exhibición de proyectos y trabajos. | `components/apps/project-gallery` |
| QR Tool | Generador y decodificador de códigos QR. | `components/apps/qr` |
| Quote | Generador y superficie de visualización de citas. | `components/apps/quote` |
| Resource Monitor | Gráficos y telemetría estilo sistema. | `components/apps/resource_monitor` |
| Screen Recorder | Usa `MediaRecorder` para captura de pantalla y guardado local. | `components/apps/screen-recorder` |
| Serial Terminal | Simulación de consola serial para comunicación de dispositivos. | `components/apps/serial-terminal` |
| Settings | Controles de configuración y personalización del escritorio. | `components/apps/settings` |
| Spotify | Reproductor web de Spotify embebido con permisos de iframe restringidos. | `components/apps/spotify` |
| Sticky Notes | Widget de post-its con persistencia local. | `components/apps/sticky_notes` |
| Subnet Calculator | Calculadora de subredes IPv4 y tablas de referencia. | `components/apps/subnet-calculator` |
| Terminal | Simulación de shell `xterm.js` con análisis personalizado e integración OPFS. | `components/apps/terminal` |
| Todoist | Interfaz web de Todoist embebida. | `components/apps/todoist` |
| Trash | Papelera virtual con acciones de restaurar y eliminar. | `components/apps/trash` |
| Visual Studio Code | Editor de StackBlitz embebido para navegación del repositorio. | `components/apps/vscode` |
| Weather | Panel meteorológico con datos en vivo o de demostración. | `components/apps/weather` |
| Weather Widget | Widget meteorológico compacto para el escritorio. | `components/apps/weather_widget` |
| X | Simulación de feed social con líneas de tiempo estáticas o alimentadas por API. | `components/apps/x` |
| YouTube | Reproductor y navegador de canales de YouTube vía API de iframe. | `components/apps/youtube` |

### Builder apps (páginas independientes)

Estas aplicaciones residen en `pages/apps` y se accede a ellas a través de rutas `/apps/*`.

| App | Detalles de implementación | Ruta principal |
| --- | --- | --- |
| SSH Command Builder | Compone comandos SSH con entradas estructuradas. | `apps/ssh` |
| HTTP Request Builder | Construye solicitudes HTTP con encabezados y cargas útiles. | `apps/http` |
| HTML Rewriter | Entorno de transformación HTML del lado del cliente. | `apps/html-rewriter` |

### Juegos

La mayoría de los juegos usan estado de React para la lógica y HTML, CSS o Canvas para el renderizado. Algunos juegos complejos usan Phaser.

| Juego | Motor o lógica | Detalles | Ruta principal |
| --- | --- | --- | --- |
| 2048 | Cuadrícula React | Juego de deslizar fichas con puntuaciones altas persistentes. | `components/apps/2048` |
| Asteroids | Canvas | Shooter arcade con un bucle de juego personalizado. | `components/apps/asteroids` |
| Battleship | React | Estrategia basada en cuadrícula con estado de IA localizado. | `components/apps/battleship.js` |
| Blackjack | React | Lógica de juego de cartas usando un estado de mazo barajado. | `components/apps/blackjack` |
| Breakout | Canvas | Rompe ladrillos con detección de colisiones físicas. | `components/apps/breakout` |
| Candy Crush | Cuadrícula React | Lógica match-3 con cascadas y animaciones. | `components/apps/candy-crush` |
| Car Racer | Canvas | Juego de carreras visto desde arriba con pista desplazable. | `components/apps/car-racer` |
| Checkers | React | Validación de movimientos y lógica de captura. | `components/apps/checkers` |
| Chess | WASM y canvas | Usa `chess.js` para validación y Stockfish para IA. | `components/apps/chess` |
| Connect Four | React | Lógica de cuadrícula con detección de cuatro en línea. | `components/apps/connect-four` |
| Flappy Bird | Canvas | Scroll lateral con gravedad y bucles de colisión. | `components/apps/flappy-bird` |
| Frogger | Canvas | Lógica de movimiento de entidades basada en carriles. | `components/apps/frogger` |
| Gomoku | React | Lógica de estado del tablero de cinco en línea. | `components/apps/gomoku` |
| Hangman | React | Adivinación de palabras con selección basada en diccionario. | `components/apps/hangman` |
| Lane Runner | Canvas | Juego de carrera infinita con cambio de carril. | `components/apps/lane-runner` |
| Memory | React | Juego de emparejar cartas con seguimiento de estado volteado. | `components/apps/memory` |
| Minesweeper | React | Lógica recursiva de flood-fill para casillas vacías. | `components/apps/minesweeper` |
| Nonogram | React | Validación de cuadrícula contra pistas de filas y columnas. | `components/apps/nonogram` |
| Pacman | React y HTML | Navegación de laberinto y lógica de búsqueda de camino de fantasmas. | `components/apps/pacman` |
| Pinball | Canvas y Matter.js | Simulación física con un motor 2D. | `components/apps/pinball` |
| Platformer | Phaser | Plataformas de scroll lateral con física y sprites. | `components/apps/platformer` |
| Pong | Canvas | Juego clásico de paletas con colisiones simples. | `components/apps/pong` |
| Reversi | React | Resaltado de movimientos válidos y volteo de piezas. | `components/apps/reversi` |
| Simon | React | Memoria de secuencias con reproducción cronometrada. | `components/apps/simon` |
| Snake | Cuadrícula React | Movimiento basado en cuadrícula con estructura de datos de cola. | `components/apps/snake` |
| Sokoban | React | Lógica de puzzle de empujar cajas. | `components/apps/sokoban` |
| Solitaire | React | Implementación de Klondike con pilas de arrastrar y soltar. | `components/apps/solitaire/index` |
| Space Invaders | Canvas | Shooter con gestor de entidades para oleadas y colisiones. | `components/apps/space-invaders` |
| Sudoku | React | Generador con backtracking para puzzles válidos. | `components/apps/sudoku` |
| Tetris | Cuadrícula React | Lógica de rotación de matrices y colisiones. | `components/apps/tetris` |
| Tic Tac Toe | React | Minimax para dificultad imbatible. | `components/apps/tictactoe` |
| Tower Defense | Canvas | Rutas, apuntado y gestión de oleadas. | `components/apps/tower-defense` |
| Word Search | React | Generación de cuadrícula con colocación multidireccional. | `components/apps/word-search` |
| Wordle | React | Validación de diccionario y persistencia de rachas. | `components/apps/wordle` |

## Stack tecnológico

- Next.js (ruteo de páginas para la UI, más `app/api` para controladores de ruta donde corresponda)
- React (base de código híbrida JS y TS)
- Tailwind CSS para estilos
- TypeScript para módulos tipados y pruebas
- Pipeline de construcción PWA vía `@ducanh2912/next-pwa` (service worker generado en tiempo de compilación)
- Pruebas
  - Pruebas unitarias Jest: `__tests__/**`
  - Pruebas end-to-end y de accesibilidad Playwright: `playwright/**`
  - Verificaciones Pa11y-ci: `pa11yci.json`
- Herramientas
  - ESLint (incluyendo reglas personalizadas en `eslint-plugin-no-top-level-window`)
  - Yarn 4 gestionado por Corepack con instalaciones inmutables

## Estructura del repositorio

Mapa de alto nivel (no exhaustivo):

```text
.
├─ pages/                  # Rutas de UI principales y rutas de API
│  ├─ api/                 # Controladores serverless (fixtures, simulaciones, integraciones)
│  └─ index.tsx            # Punto de entrada del escritorio
├─ app/api/                # Controladores de ruta (API del app router de Next)
├─ components/             # Interfaz de escritorio, apps, bloques de construcción de UI compartidos
├─ hooks/                  # Hooks de React compartidos (configuración, guardias, etc.)
├─ utils/                  # Utilidades transversales (almacenamiento, analítica, ayudantes CSP)
├─ public/                 # Activos estáticos, fixtures, activos PWA, datos de demostración
├─ docs/                   # Notas de arquitectura, listas de verificación y profundizaciones
├─ __tests__/              # Pruebas Jest
├─ playwright/             # Pruebas y ayudantes de Playwright
├─ scripts/                # Automatización de dev/build, herramientas de lint, ayudantes de CI
├─ plugins/                # Catálogo de plugins y demos de plugins en sandbox
└─ vercel.json             # Configuración de compilación y tiempo de ejecución de Vercel
```

## Cómo funciona

### Interfaz de escritorio

La experiencia de escritorio se monta desde `pages/index.tsx`, que renderiza `components/ubuntu.js` como la interfaz principal de nivel superior. Esa interfaz coordina las pantallas de inicio y bloqueo, el diseño del escritorio y las preocupaciones de UI a nivel de sistema.

### Tiempo de ejecución de apps y carga dinámica

Las aplicaciones se cargan con importaciones dinámicas a través del registro definido en `apps.config.js` (ver los ayudantes `createDynamicApp` en `utils/createDynamicApp.js`). Esto mantiene el paquete inicial ligero y hace que el sistema se sienta responsivo porque las aplicaciones grandes se compilan y cargan solo cuando se abren.

### Modelo de seguridad basado en simulación

Este repositorio está estructurado intencionalmente para que las herramientas de seguridad permanezcan demostrativas:

- Los flujos de UI están diseñados para parecer auténticos mientras producen salidas deterministas y seguras.
- Las rutas de API en `pages/api/**` están protegidas por banderas de características y se implementan como puntos finales de simulación con fixtures, conjuntos de datos sin conexión o generadores deterministas.
- El proveedor de Configuración puede bloquear solicitudes de red de origen externo en el navegador cuando `allowNetwork` está desactivado.

Si estás extendiendo la plataforma, trata el límite de la simulación como un requisito estricto. El playbook de mantenimiento en `AGENTS.md` es el contrato para las contribuciones.

### Modelo de persistencia

Las preferencias del usuario se almacenan en el lado del cliente:

- La configuración usa IndexedDB (vía `idb-keyval`) y alternativas seguras de almacenamiento local donde corresponda.
- La experiencia de escritorio también puede persistir el diseño y elementos recientes a través de utilidades en `utils/**` (ver `utils/safeStorage.ts`, `utils/recentStorage.ts` y módulos relacionados).

### PWA y modo sin conexión

Un service worker se genera durante `yarn build` y se emite a `public/sw.js`. Los activos de respaldo sin conexión residen en `public/offline.*` y se usan para mantener la experiencia utilizable incluso cuando el acceso a la red es limitado.

## Inicio rápido

### Prerrequisitos

- Node.js 20 (ver `.nvmrc`)
- Yarn 4.9.2 vía Corepack (ver `package.json#packageManager`)

### Instalación

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
yarn install --immutable
```

### Ejecutar (desarrollo)

```bash
yarn dev
```

El servidor de desarrollo se ejecuta en http://localhost:3000.

Banderas de comodidad para desarrollo:

- Limpiar directorio dist de desarrollo: `yarn dev --clean` (también acepta `--clean-dist` o `--reset-cache`)
- Controlar reenvío de Turbopack: `yarn dev --turbo` o `yarn dev --no-turbo`

### Compilar y ejecutar (producción)

```bash
yarn build
yarn start
```

### Verificación en un solo comando

Ejecuta el pipeline completo de controles de calidad locales (lint, verificación de tipos, pruebas, pruebas de humo según configuración):

```bash
yarn verify:all
```

## Configuración

### Variables de entorno

Comienza desde `.env.local.example` (local) o `.env.example` (referencia). El proyecto está diseñado para ejecutarse sin secretos en modo demostración, pero algunas integraciones requieren claves.

Banderas centrales e integraciones:

| Variable | Predeterminado | Propósito |
| --- | --- | --- |
| NEXT_PUBLIC_DEMO_MODE | false | Habilita alternativas seguras de demostración para integraciones (recomendado para Vista previa). |
| NEXT_PUBLIC_ENABLE_ANALYTICS | false | Habilita la conexión de `@vercel/analytics`. |
| NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS | false | Habilita la conexión de Vercel Speed Insights. |
| NEXT_PUBLIC_UI_EXPERIMENTS | false | Habilita experimentos de UI opcionales. |
| NEXT_PUBLIC_STATIC_EXPORT | false | Habilita el modo de exportación estática (usado para compilaciones de GitHub Pages). |
| NEXT_PUBLIC_BASE_PATH / BASE_PATH | vacío | Anulación de ruta base para despliegues en subdirectorios. |
| NEXT_PUBLIC_RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET | vacío | Protección contra spam del formulario de contacto. |
| NEXT_PUBLIC_USER_ID / NEXT_PUBLIC_SERVICE_ID / NEXT_PUBLIC_TEMPLATE_ID | vacío | Configuración de EmailJS para formularios de contacto. |
| NEXT_PUBLIC_YOUTUBE_API_KEY / YOUTUBE_API_KEY | vacío | Uso de la API de YouTube (opcional). |
| NEXT_PUBLIC_YOUTUBE_CHANNEL_ID | vacío | Ámbito de canal para la aplicación de YouTube. |
| NEXT_PUBLIC_CURRENCY_API_URL | vacío | Endpoint de API de conversión de moneda (opcional). |
| NEXT_PUBLIC_GHIDRA_WASM / NEXT_PUBLIC_GHIDRA_URL | vacío | Conexión de simulación de Ghidra (opcional). |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | vacío | Configuración del cliente de Supabase. |
| SUPABASE_SERVICE_ROLE_KEY | vacío | Operaciones de Supabase en el lado del servidor donde sea necesario. |

### Banderas de características

Las banderas de características mantienen intencionalmente la funcionalidad potencialmente sensible inactiva a menos que se habilite explícitamente:

| Variable | Valores | Ámbito |
| --- | --- | --- |
| FEATURE_TOOL_APIS | enabled o disabled | Envuelve rutas de API de simulación que presentan salidas tipo herramienta. El valor predeterminado debe permanecer deshabilitado por seguridad. |
| FEATURE_HYDRA | enabled o disabled | Control adicional para las superficies de simulación de Hydra. El valor predeterminado debe permanecer deshabilitado. |

### Política de seguridad de contenido (CSP) y encabezados de seguridad

Este repositorio adopta una postura segura por defecto con CSP y otros encabezados configurados en:

- `next.config.js` (políticas estáticas de encabezados)
- `middleware.ts` (generación de nonce por solicitud y ensamblaje de CSP)

Si agregas nuevos embeds, multimedia externa, analítica o fuentes de scripts, actualiza las listas blancas de CSP en consecuencia. Mantén el conjunto lo más pequeño posible y prefiere el alojamiento en el mismo origen para los activos.

## Flujos de trabajo para desarrolladores

### Scripts

Los scripts más comunes (ver `package.json#scripts` para la lista completa):

- `yarn dev`: servidor de desarrollo local (wrapper personalizado en `scripts/dev.mjs`)
- `yarn build`: compilación de producción (Next.js)
- `yarn start`: ejecutar servidor de producción
- `yarn test`: suite de pruebas Jest
- `yarn test:watch`: modo observador de Jest
- `yarn lint`: control de lint del repositorio (wrapper consciente de archivos modificados en `scripts/lint-changed.mjs`)
- `yarn typecheck`: verificación de TypeScript sin emisión
- `yarn a11y`: ejecución local de accesibilidad (Pa11y y Playwright)
- `yarn smoke`: pruebas de humo que abren y validan todo el catálogo de aplicaciones
- `yarn analyze`: compilación de análisis de paquetes (establece `ANALYZE=true`)
- `yarn module-report`: genera artefactos de informe de módulos
- `yarn verify:all`: ejecutar la suite equivalente a CI local

### Pruebas

- Las pruebas unitarias Jest residen en `__tests__/`.
- Las pruebas de Playwright residen en `playwright/` y `playwright.config.ts`.
- El pipeline de accesibilidad puede ejecutarse localmente vía `yarn a11y` y en GitHub Actions vía `.github/workflows/a11y.yml`.

### Accesibilidad

La accesibilidad se trata como un requisito de primera clase:

- Verificaciones automatizadas: Pa11y-ci más cobertura de accesibilidad de Playwright.
- Navegación por teclado: los enlaces de salto y hitos del escritorio están implementados en la interfaz; ver `docs/keyboard-only-test-plan.md` y `docs/desktop-layout-landmarks.md`.

### Linter y seguridad de tipos

- ESLint se aplica en CI y localmente con `yarn lint`.
- Las verificaciones de TypeScript sin emisión se aplican con `yarn typecheck`.
- `eslint-plugin-no-top-level-window` previene patrones que rompen SSR o el análisis estático.

## Despliegue

### Vercel

Este repositorio está configurado para compilaciones deterministas en Vercel:

- `vercel.json` establece `installCommand` en `corepack enable && yarn install --immutable`.
- `vercel.json` establece `buildCommand` en `yarn build`.
- El runtime de funciones está fijado para ambas rutas `pages/api` y `app/api`.

Recomendaciones para entorno de vista previa:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `FEATURE_TOOL_APIS=disabled`
- `NEXT_PUBLIC_ENABLE_ANALYTICS=false`
- `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=false`

Los despliegues de vista previa están diseñados para ser compartibles e aislados de producción. El repositorio incluye documentación sobre cómo mantener las compilaciones de Vista previa deterministas y evitar compilaciones accidentales de `gh-pages`: ver `docs/vercel.md`.

### Exportación a GitHub Pages

Existe una ruta de exportación estática para demostraciones donde no se requieren APIs serverless:

- Usa `yarn export` para compilar con `NEXT_PUBLIC_STATIC_EXPORT=true`.
- El flujo de trabajo `.github/workflows/gh-deploy.yml` puede publicar la salida en una rama `gh-pages`.

Si estás usando tanto Vercel como GitHub Pages en el mismo repositorio, asegúrate de que Vercel no intente compilar la rama `gh-pages` (ver `docs/vercel.md` y `scripts/vercel-ignore-build.sh`).

## Operaciones

### Analítica

La analítica es opcional (opt-in):

- `NEXT_PUBLIC_ENABLE_ANALYTICS=true` habilita Vercel Analytics.
- `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true` habilita Vercel Speed Insights.

Mantén la analítica deshabilitada por defecto para desarrollo local y vistas previas a menos que necesites explícitamente los datos.

### Informes de errores

El registro de errores del cliente se enruta a través de un controlador de ruta Next en `app/api/log-client-error/route.ts`. Mantén las cargas útiles de errores mínimas y evita incluir datos sensibles del usuario.

## Contribuir

Lee esto primero:

- `AGENTS.md` (playbook de mantenimiento y contrato de contribución)
- `docs/new-app-checklist.md` (cómo agregar nuevas aplicaciones sin degradar la UX o el rendimiento)
- `docs/terminal-simulation.md` (restricciones de diseño de UX y salida de terminal)

Principios generales:

- Preserva el límite de la simulación: sin lógica ofensiva real, sin tráfico de red saliente descontrolado.
- Mantén el escritorio responsivo: prefiere importaciones dinámicas, límites de paquetes y primitivas compartidas pequeñas.
- Mantén los controles de calidad: las pruebas, lint, verificación de tipos y accesibilidad deben permanecer verdes.

## Registro de cambios y versionado

Los cambios legibles por humanos se rastrean en `CHANGELOG.md`. El formato del changelog sigue Keep a Changelog y debe permanecer curado en lugar de volcado automáticamente desde los registros de git.

## Seguridad

- Denegación por defecto para acceso a redes externas desde el cliente (`allowNetwork` en Configuración).
- Las rutas serverless destinadas a salidas tipo herramienta están protegidas por banderas de entorno.
- CSP y encabezados de seguridad están configurados en `next.config.js` y `middleware.ts`.

Si descubres un problema de seguridad, abre un Asesor de Seguridad de GitHub o contacta al mantenedor en privado.

## Solución de problemas

### Incompatibilidad de versión de Node

Si las instalaciones o compilaciones fallan, asegúrate de que Node 20 esté activo:

```bash
nvm install
nvm use
node -v
```

### Fallos en instalaciones inmutables de Yarn

Si `yarn install --immutable` falla:

- Asegúrate de no haber modificado `yarn.lock` sin confirmar los cambios.
- Elimina `node_modules` y vuelve a intentar con una instalación limpia.
- Evita mezclar administradores de paquetes.

### Fallos en despliegues de vista previa en Vercel

Causas comunes:

- Vercel intentando compilar la rama `gh-pages` (debería estar deshabilitada o ignorada).
- Faltan Corepack o fijación de versión de Yarn.
- Integraciones opcionales habilitadas sin proporcionar las variables de entorno requeridas.

Ver `docs/vercel.md` para una lista de verificación de configuración reforzada.

### Problemas de instalación de navegador de Playwright

En CI o en máquinas nuevas:

```bash
npx playwright install --with-deps
```

### CSP rompe embeds o contenido externo

Si un nuevo embed no logra cargar:

- Actualiza las listas blancas de CSP en `middleware.ts` y `next.config.js`.
- Prefiere activos del mismo origen siempre que sea posible.

## Licencia

Ver [LICENSE](LICENSE).
