# Security

## Middleware subrequest header

To prevent abuse of the Next.js middleware internals, block any public request carrying the `x-middleware-subrequest` header. This value is used solely by internal middleware logic and must not be exposed to the internet.

### CDN/WAF configuration

- **Cloudflare firewall rule**
  ```
  Expression: http.request.headers["x-middleware-subrequest"][0] exists
  Action: Block
  ```

- **AWS WAF rule**
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

Deployments should ensure requests with this header never reach the application servers.
