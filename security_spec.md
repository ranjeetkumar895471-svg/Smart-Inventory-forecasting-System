# Security Specification — Smart Investor Forecasting System

## 1. Data Invariants
1. **User & Role Integrity**: A user document `/users/{userId}` can only be created by the matching authenticated UID (`request.auth.uid == userId`), must have `role == 'investor'` on self-registration unless the caller is already a verified admin, and non-admins can never modify `role`, `status`, `email`, or `uid`.
2. **Ownership Isolation**: Every record in `portfolios`, `watchlists`, `forecasts`, `reports`, and `auditLogs` must carry a `userId` equal to `request.auth.uid` on create, `userId` is immutable on update, and `list` queries are restricted by `resource.data.userId == request.auth.uid` (or verified bootstrapped admin).
3. **Catalog & System Data Integrity**: Only verified admins may create, update, or delete records in `stocks`, `historicalPrices`, and `admins`.
4. **Temporal & Volumetric Integrity**: Every `createdAt` and `updatedAt` timestamp must equal `request.time`. All string fields and document IDs are strictly bounded in length and validated against safe character patterns.
5. **Audit Log Immutability**: Documents in `auditLogs` can only be created with `userId == request.auth.uid` and can never be updated or deleted.

## 2. Dirty Dozen Adversarial Payloads
1. **Self-Privilege Escalation (User Create)**: `POST /users/{uid}` with `role: "admin"` by non-admin user -> **DENIED**.
2. **Role Mutation (User Update)**: `PATCH /users/{uid}` changing `role` from `"investor"` to `"admin"` by owner -> **DENIED**.
3. **Cross-Tenant Portfolio Write**: `POST /portfolios/{id}` with `userId: "victim_uid"` while authenticated as `"attacker_uid"` -> **DENIED**.
4. **Shadow Field Injection**: `POST /portfolios/{id}` adding undeclared field `isApproved: true` -> **DENIED**.
5. **Path ID Poisoning**: `POST /watchlists/invalid$id!with/slash` or >128 chars -> **DENIED**.
6. **Client Timestamp Forgery**: `POST /forecasts/{id}` with backdated `createdAt` instead of `request.time` -> **DENIED**.
7. **PII Blanket Read**: `GET /users/{other_uid}` by non-admin authenticated user -> **DENIED**.
8. **Unscoped List Query**: `LIST /portfolios` without `where('userId', '==', uid)` by non-admin -> **DENIED**.
9. **Unauthorized Stock Catalog Modification**: `POST /stocks/FAKE` by regular investor -> **DENIED**.
10. **Audit Log Tampering**: `UPDATE` or `DELETE` on `/auditLogs/{logId}` -> **DENIED**.
11. **Unverified Email Spoofing**: Admin email claim with `email_verified: false` -> **DENIED**.
12. **Quantity / Price Type Poisoning**: `POST /portfolios/{id}` with `quantity: -5` or string `"100"` -> **DENIED**.
