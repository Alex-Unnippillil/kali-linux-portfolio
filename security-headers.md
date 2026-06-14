# Security Headers

These headers can be served by the platform (e.g., Vercel, Nginx, or similar) to harden the site. Values below are safe defaults and ready to deploy for this portfolio.

## Content-Security-Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self';
upgrade-insecure-requests;
```

## Referrer-Policy

```
strict-origin-when-cross-origin
```

## X-Frame-Options

```
DENY
```

## Permissions-Policy

```
accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```

These policies block unused APIs, deny framing, and limit scripts and styles to this origin. Update the directives if new features or third-party resources are introduced.
