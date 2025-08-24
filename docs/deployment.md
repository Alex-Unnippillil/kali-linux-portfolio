# Deployment

When deploying this application, enforce a firewall rule at your CDN or WAF to reject any request containing the header `x-middleware-subrequest`. This header is reserved for internal Next.js middleware calls and should never be present in external traffic.

## Cloudflare firewall rule

```
Expression: http.request.headers["x-middleware-subrequest"][0] exists
Action: Block
```

## AWS WAF rule

```
{
  "Name": "BlockMiddlewareSubrequest",
  "Priority": 0,
  "Statement": {
    "ByteMatchStatement": {
      "SearchString": "1",
      "FieldToMatch": { "SingleHeader": { "Name": "x-middleware-subrequest" } },
      "TextTransformations": [{ "Priority": 0, "Type": "NONE" }],
      "PositionalConstraint": "EXACTLY"
    }
  },
  "Action": { "Block": {} }
}
```

By filtering this header, you ensure that only legitimate middleware invocations occur within the application.

This application requires a running Next.js server to handle API routes and real-time features such as Socket.IO. Production builds should be created and started with:

```bash
yarn build
yarn start
```

Platforms that support running a Node.js server (Vercel, Render, Fly.io, etc.) can host the application. Static export via `next export` is unsupported because WebSocket endpoints and API routes need server execution.
