# HIBP Password Check

The `/api/hibp-check` endpoint uses the Have I Been Pwned Pwned Passwords
range API to determine how often a password hash has appeared in data leaks.

- **Rate limiting** – each IP address may make up to 60 requests per minute.
  Responses include `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.
  Exceeding the quota returns HTTP `429` with a `Retry-After` header.

Example request:

```http
POST /api/hibp-check
Content-Type: application/json

{"password": "hunter2"}
```

Example response:

```json
{"prefix": "5BAA6", "count": 3303003}
```
