# CVE Search API

The `/api/cve` endpoint queries the NVD v2 API (using an API key with
automatic backoff) and enriches results with CISA Known Exploited
Vulnerabilities and EPSS scores.

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

### Query Parameters

- `keyword` – keyword search
- `domain` – limit to a domain in the description
- `vendor` / `product` – build a CPE filter
- `startDate` / `endDate` – publication date range (`YYYY-MM-DD`)
- `cvss` – minimum CVSS base score
- `epss` – minimum EPSS score
- `kev` – set to `1` to return only CISA KEV entries
- `severity` – comma separated list of severities
