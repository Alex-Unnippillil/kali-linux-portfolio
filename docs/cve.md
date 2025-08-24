# CVE Search API

The `/api/cve` endpoint queries the NVD database and enriches results with
known exploited vulnerabilities and EPSS scores.

- **Rate limiting** – up to 60 requests per minute are allowed per IP address.
  Responses include `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.
  When the limit is exceeded the server responds with HTTP `429` and a
  `Retry-After` header.

Example request:

```http
/api/cve?keyword=openssl&recent=30
```

The response body contains a JSON object with vulnerability details. Clients
should honor the caching headers and rate limit indicators.
