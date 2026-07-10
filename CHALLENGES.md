# AgroNexus — Challenges & Issues Log

A record of the problems encountered while building the platform, reconstructed
from git history, fix scripts, migration files, and code comments.

---

## 1. Database & Supabase

### User deletion broke on foreign keys
Deleting a user from the admin panel failed because `notifications.user_id`,
`orders.consumer_id`, and `transport_requests.transporter_id` all referenced
`users` without `ON DELETE CASCADE`. It bit twice — the notifications key was
patched first, then `fix_notifications_fkey.sql` had to redo all three keys
("in case the previous fix wasn't run yet").

### Migration churn from manual SQL
Schema changes were applied by hand in the Supabase SQL Editor, which produced
overlapping one-off scripts (`update_roles.sql`, `migration_location.sql`) that
got out of sync with each other. **Resolution:** consolidate everything into a
single idempotent `migration_v2_roles_and_market.sql` that is safe to re-run,
and delete the superseded files.

---

## 2. Mid-project requirements rework (v2)

### The single "consumer" role was wrong
The buyer side had to be split into `wholesaler` / `retailer` /
`direct_consumer` after the original modules were already "done" — with the
added wrinkle that pre-v2 JWTs carrying `consumer` had to keep validating, so
the legacy role lives on in `BUYER_ROLES`, and the DB column is still named
`consumer_id`.

### Manual region selection dropped for auto-location
Region became derived from GPS/IP coordinates via a `derive_region`
nearest-centroid DB trigger instead of user input — which meant reworking
registration on web and mobile, adding Android/iOS location permissions, and
handling permission denial gracefully (region just stays unset).

### Marketplace anonymization
Buyers must never see farmer identity, which required the
`marketplace_listings` view and reworking the listings endpoints to return
anonymized columns only.

### Over-allocation risk
Farmers splitting a listing across regions could allocate more kg than the
listing held — enforced with a DB trigger that rejects excess totals rather
than trusting the API layer.

---

## 3. ML service

### The planned LSTM was abandoned
The original design called for an LSTM (64→32 units, `model.h5`, TensorFlow),
but the shipped pipeline is scikit-learn: GradientBoostingRegressor +
MLPRegressor with `.pkl` artifacts. The upside: MLP hit **7.18% MAPE** against
the ≤25% target, with GBM (11.12%) as the fallback. TensorFlow is still listed
in `ml/requirements.txt` even though nothing imports it (see §8).

### No real demand data at the start
Training initially relied on WFP Ghana price data plus a generated demand
dataset. The retraining feed on real orders came last: `demand_weekly` view →
`npm run export:demand` → `ml/data/platform_demand.csv`, blended in `train.py`
with platform rows winning on overlap.

---

## 4. Build & TypeScript issues (pre-deploy cleanup, commit `05c7d41`)

- `tsc` build failed on **top-level await in test files** — tests had to be
  excluded from the build tsconfig, with a separate `tsconfig.test.json`
  (NodeNext) for vitest.
- **Missing `vite-env.d.ts`** meant `ImportMeta.env` and CSS imports didn't
  typecheck on the web app.
- **Supabase client null-narrowing** bug in `useRealtimeChannel`.
- Deprecated Tailwind `flex-shrink-0` classes had to become `shrink-0` across
  components.
- Leftover unused imports (e.g. `Navigate` in `App.tsx`) blocking strict
  builds.

---

## 5. Legacy code drift

### Duplicate JS/TS backends coexisted
Root-level plain-JavaScript files (`server.js`, `middleware/`, `routes/`)
survived after the backend moved to TypeScript `src/`, creating a confusing
shadow implementation until commit `2da5188` deleted them.

---

## 6. Networking / integration

### CORS only allowed one origin
The original config broke as soon as a second origin (deployed Vercel domain,
mobile device IP) was needed — rewritten to parse a comma-separated
`CORS_ORIGIN` env var with an origin callback (commit `a891a42`).

### Android emulator can't reach `localhost`
The mobile app has to use `10.0.2.2:3001` on the emulator and a hand-edited
machine IP in `lib/config/constants.dart` for physical devices.

---

## 7. Prototype scope compromises

- **No SMS gateway** — the notification fallback is a console log plus a
  `notifications` table insert.
- **Offline mode is read-only** — Hive cache with a 1-hour TTL and an offline
  banner; writes require connectivity.

---

## 8. Still open

- **Phase 10 (deployment)** to Render + Vercel is the only phase not started,
  and it carries known follow-ups: setting `VITE_API_URL`, adding the Vercel
  domain to `CORS_ORIGIN`, and removing the unused TensorFlow entry from
  `ml/requirements.txt` (it needlessly bloats the ML Docker image).
- **CLAUDE.md's ML section is stale** — it still describes the LSTM /
  `model.h5` architecture that was replaced by the scikit-learn pipeline.

---

*Caveat: this log covers what the repo records. Struggles that left no trace
(debugging sessions, Supabase dashboard work, RLS policy trial-and-error) are
not captured here.*
