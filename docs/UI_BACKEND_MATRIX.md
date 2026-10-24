# Pharmacy UI to backend matrix

| UI area | Persistent integration | Authorization / validation | State handling |
|---|---|---|---|
| Email, Google, Facebook auth | Supabase Auth client | Supabase provider/session rules; backend verifies JWT JWKS + issuer + audience | Existing auth feedback preserved |
| Registration steps and draft | `PUT /applications/current/draft`; pharmacies, memberships, applications, hours, closures | Authenticated owner; draft/needs-changes only; coordinate, uniqueness, and field constraints | Pre-auth answers remain a privacy-scrubbed browser draft; authenticated progress is persisted |
| Documents and OCR | `POST /documents/{type}`; private Storage and document metadata; Render `/v1/analyze` | Membership, magic-byte/type/10 MB checks, user-scoped Storage path | Local quality feedback, OCR warnings, manual-review fallback |
| Application status | `GET /applications/current` | Application creator only | Draft/submitted/review/decision states; refresh uses saved data |
| Dashboard | Inventory, analytics, identity, document endpoints | Approved active pharmacy membership | Existing loading/empty panels retained |
| Inventory CRUD | `/inventory`, `/inventory/{id}` | Approved membership, pharmacy-scoped SQL, enum/check constraints, optimistic version | Real refresh, errors, soft deletion, history audit |
| Inventory CSV | `POST /inventory/imports` | Same validation and transaction scope as single-row writes; 500-row limit | Existing preview and row errors retained; backend result is authoritative |
| Analytics | `GET /analytics?start&end` | Approved membership; inclusive Asia/Manila dates; max 366 days | Today/7/30/custom refresh all cards; zero-value days are real, not fabricated |
| Pharmacy profile and hours | `GET/PUT /pharmacy/profile` | Approved owner/manager; version check; coordinate constraints | Real persisted initial values and stale-write error |
| Verification center | `GET /documents`, signed preview endpoint, replacement upload | Pharmacy isolation plus private, 60-second signed links | Loading/empty/upload/error states |
| Notifications | `GET /notifications`, read and read-all patches | User-owned rows only | Persistent unread state and counts |
| Account providers | Supabase `getUser` and `linkIdentity` | Current authenticated identity | Real provider/email status |
| Password security | Backend challenge endpoints plus Supabase reauthentication nonce | HMAC digest, throttling, attempts, expiry, one-time token, Supabase nonce | Sensitive form stays locked until gate verification |

The current Pharmacy UI has no order, payment, prescription fulfillment, delivery, or ecommerce controls, so none were introduced.

