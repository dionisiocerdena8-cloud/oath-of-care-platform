# Oath of Care Pharmacy API

Spring Boot 3.5 API for the existing pharmacy portal. It validates Supabase access tokens through the project's rotating JWKS, applies server-side pharmacy membership checks, and persists pharmacy data in Supabase PostgreSQL.

## Local run

1. Copy `.env.example` values into your local environment (never commit secrets).
2. Apply the reviewed migration in `../supabase/migrations` to a local Supabase/Postgres instance.
3. Keep `FLYWAY_ENABLED=false` for remote databases until the owner explicitly approves migration application. For an empty local database, set it to `true`.
4. Run `mvn spring-boot:run` with Java 21 or newer.

For every production deployment set `REQUIRE_SECURE_SECRETS=true` and provide a unique random `SECURITY_CHALLENGE_PEPPER` of at least 32 characters. The application refuses to start in strict mode when the development value is still present.

The API base is `http://localhost:8080/api/v1`. Set the frontend's `VITE_API_BASE_URL` to that value.

## Security model

- Supabase JWT signature, issuer, expiry, not-before, and `authenticated` audience are validated by Spring Security.
- Membership and approval state are read from server-controlled database records, never `user_metadata`.
- Operational endpoints require an active membership in an approved pharmacy. Inventory changes accept active `OWNER`, `MANAGER`, or `STAFF` members; application editing is owner-only; regulatory documents are owner/manager-only.
- The API uses a server-only direct PostgreSQL connection. Because a deployment may configure a database user that bypasses RLS, every protected query also scopes by the authenticated user or their server-loaded pharmacy membership. Do not expose the database credential or reuse it in the frontend.
- Regulatory document uploads are forwarded with the user's JWT to the private `pharmacy-documents` bucket; no service-role key is used. Public pharmacy logos/photos use the separate `pharmacy-media` bucket and never share document paths.
- Password UI access codes are HMAC-digested, rate-limited, single-use, and short-lived. The actual password update additionally requires Supabase `reauthenticate()` and its nonce.
- OCR calls are server-to-server and read `OCR_API_TOKEN` only from backend environment variables. Raw OCR text and extracted candidate fields are purged by the database after a document reaches `VERIFIED` or `REJECTED`.
- Server-controlled tables are read-only to the Supabase `authenticated` Data API role. Mutations go through the Spring API, while database triggers preserve immutable ownership and state-transition rules.

## Verification

```bash
mvn test
supabase test db
```

The pgTAP security suite is `../supabase/tests/pharmacy_security_rls.test.sql`. Run it against an isolated local Supabase stack after applying the migration; never point this test at production.

OpenAPI is available at `/swagger-ui/index.html` in development. Health probes are available at `/actuator/health`.

## Cloud Deployment (Render Docker)

The backend is containerized via the root `Dockerfile` using a multi-stage Java 21 build.

### Build & Run locally with Docker
```bash
docker build -t oath-pharmacy-api .
docker run -p 8080:8080 -e DATABASE_URL="..." -e DATABASE_USERNAME="..." -e DATABASE_PASSWORD="..." oath-pharmacy-api
```

### Render Web Service Configuration
- **Environment**: Docker
- **Docker Context**: `.` (repository root)
- **Dockerfile Path**: `./Dockerfile`
- **Health Check Path**: `/actuator/health`
- See [../DEPLOYMENT.md](../DEPLOYMENT.md) for full environment variable matrix and CORS configuration.


