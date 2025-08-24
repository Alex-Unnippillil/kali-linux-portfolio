# Deployment

For security-related deployment steps, including firewall rules for sensitive headers, see [security.md](./security.md).

This application requires a running Next.js server to handle API routes and real-time features such as Socket.IO. Production builds should be created and started with:

```bash
yarn build
yarn start
```

Platforms that support running a Node.js server (Vercel, Render, Fly.io, etc.) can host the application. Static export via `next export` is unsupported because WebSocket endpoints and API routes need server execution.
