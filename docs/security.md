# Security

## Middleware subrequest header


If this header is not blocked, attackers could craft requests with the `x-middleware-subrequest` header to bypass middleware protections, interfere with internal routing, or gain unauthorized access to resources. This could lead to privilege escalation, information disclosure, or other security vulnerabilities.
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
