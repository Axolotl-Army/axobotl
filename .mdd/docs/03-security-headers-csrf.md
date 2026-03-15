---
id: 03-security-headers-csrf
title: Security Headers & CSRF Protection
edition: Dashboard
depends_on: [02-dashboard-nextjs-migration]
source_files:
  - src/dashboard/next.config.ts
  - src/dashboard/middleware.ts
routes: []
models: []
test_files:
  - tests/unit/security-headers.test.ts
known_issues: []
---

# 03 -- Security Headers & CSRF Protection

## Purpose

Harden the Next.js dashboard by adding industry-standard security
response headers and origin-based CSRF protection for state-changing
requests. This reduces the attack surface against clickjacking,
MIME-sniffing, and cross-site request forgery.

## Architecture

Two layers of defence, both handled at the Next.js level:

1. **Security headers** -- configured via `next.config.ts` `headers()`
   function. Applied to every response from the dashboard.
2. **Origin-based CSRF middleware** -- a `middleware.ts` Edge function
   that validates the `Origin` header on mutating HTTP methods
   (POST/PUT/PATCH/DELETE). GET/HEAD/OPTIONS are exempt.

NextAuth.js already handles CSRF for its own `/api/auth/*` routes, so
the middleware skips those paths.

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

1. Middleware intercepts every request.
2. For non-GET/HEAD/OPTIONS methods, compare the `Origin` header against
   the request host.
3. If `Origin` is missing or does not match the host, return 403.
4. GET/HEAD/OPTIONS pass through (safe methods, no state change).
5. `/api/auth/*` routes are excluded (NextAuth handles its own CSRF).

## Business Rules

- All responses include the security headers listed above.
- Mutating requests without a matching Origin header are rejected 403.
- The health endpoint (`/api/health`) remains fully public.
- Existing GET-only API routes are unaffected.

## Dependencies

- 02-dashboard-nextjs-migration (Next.js app must exist)

## Known Issues

None.
