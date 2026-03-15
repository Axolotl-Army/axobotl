---
id: 03-security-headers-csrf
title: Security Headers, CSRF & Rate Limiting
edition: Dashboard
depends_on: [02-dashboard-nextjs-migration]
source_files:
  - src/dashboard/next.config.ts
  - src/dashboard/middleware.ts
  - src/dashboard/lib/auth.ts
routes: []
models: []
test_files:
  - tests/unit/security-headers.test.ts
  - tests/unit/rate-limiting.test.ts
  - tests/unit/secure-cookies.test.ts
known_issues: []
---

# 03 -- Security Headers, CSRF & Rate Limiting

## Purpose

Harden the Next.js dashboard by adding industry-standard security
response headers, origin-based CSRF protection for state-changing
requests, rate limiting for brute-force prevention, and environment-aware
secure cookie configuration.

## Architecture

Three layers of defence, all handled at the Next.js level:

1. **Security headers** -- configured via `next.config.ts` `headers()`
   function. Applied to every response from the dashboard.
2. **Origin-based CSRF middleware** -- a `middleware.ts` Edge function
   that validates the `Origin` header on mutating HTTP methods
   (POST/PUT/PATCH/DELETE). GET/HEAD/OPTIONS are exempt.
3. **Rate limiting** -- in-memory sliding window rate limiter in
   `middleware.ts`. Auth endpoints: 10 req/min. API v1 endpoints:
   60 req/min. Returns 429 with Retry-After header when exceeded.

NextAuth.js already handles CSRF for its own `/api/auth/*` routes, so
the middleware skips those paths for CSRF but still rate-limits them.

## Security Headers

| Header | Value | Purpose |
|---|---|---|
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME-type sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referer leakage |
| X-DNS-Prefetch-Control | off | Prevent DNS prefetch leaks |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Restrict browser APIs |

Content-Security-Policy is omitted for now because the dashboard loads
third-party fonts (Google Fonts) and inline styles from Bootstrap, which
would require extensive `unsafe-inline` exceptions that defeat the purpose.
HSTS is omitted because it can brick non-HTTPS dev setups.

## CSRF Protection

Origin-based validation (recommended by Next.js and OWASP):

1. Middleware intercepts every request matching `/api/:path*`.
2. Rate limiting is checked first (before CSRF) to block brute-force early.
3. For non-GET/HEAD/OPTIONS methods, compare the `Origin` header against
   the request host.
4. If `Origin` is missing or does not match the host, return 403.
5. GET/HEAD/OPTIONS pass through (safe methods, no state change).
6. `/api/auth/*` routes are excluded from CSRF (NextAuth handles its own).

## Rate Limiting

In-memory sliding window approach (suitable for standalone Node.js deployment):

| Endpoint prefix | Limit | Window |
|---|---|---|
| `/api/auth/*` | 10 requests | 1 minute |
| `/api/v1/*` | 60 requests | 1 minute |

Rate limit key: client IP (from `x-forwarded-for` or `request.ip`).
Periodic cleanup runs every 60s to prevent memory leaks.

When exceeded, returns HTTP 429 with headers:
- `Retry-After` (seconds until next allowed request)
- `X-RateLimit-Limit` (max requests per window)
- `X-RateLimit-Remaining: 0`

## Secure Cookies

NextAuth session cookies are configured based on `NODE_ENV`:

| Environment | Cookie name | Secure flag |
|---|---|---|
| production | `__Secure-next-auth.session-token` | `true` |
| development/test | `next-auth.session-token` | `false` |

All environments: `httpOnly: true`, `sameSite: lax`, `path: /`.

## Business Rules

- All responses include the security headers listed above.
- Mutating requests without a matching Origin header are rejected 403.
- Requests exceeding rate limits receive 429 with Retry-After header.
- Auth and API rate limits are tracked independently per IP.
- The health endpoint (`/api/health`) is not rate-limited.
- Secure cookies are automatic -- no env var needed.

## Dependencies

- 02-dashboard-nextjs-migration (Next.js app must exist)

## Known Issues

None.
