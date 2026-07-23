# AgroNexus — Setup & Go-Live Checklist

Everything that must be configured by hand, in the order to do it. Code is
already wired for all of it — these are the external steps only.

---

## 1. Supabase — run the pending migration

Open the Supabase dashboard → SQL Editor and run, in this order (each is
idempotent, re-running is safe):

1. `supabase_setup.sql` — already applied ✅
2. `migration_v2_roles_and_market.sql` — already applied ✅
3. **`migration_v3_payments_and_events.sql` — RUN THIS** ⬅️ pending

Until v3 runs there is no `payments` table, so checkout only works in
payment-skipped test mode and site-event tracking warns.

---

## 2. RushPay — account, API application, keys

1. Create the account at https://rushpay.cash (Ghana, GHS).
2. In the dashboard → **API Keys** → create an **API application**. It asks for:
   - a description (e.g. "AgroNexus marketplace checkout")
   - a **webhook URL** — see §3 below for exactly what to enter.
3. **Wait for RushPay admin approval** — new API keys cannot process live
   requests until approved. Factor this into the timeline.
4. When approved, put the credentials in `backend/.env` (and in Render's
   environment settings for production):

```
RUSHPAY_API_KEY=<from the API Keys page>
RUSHPAY_WEBHOOK_SECRET=<webhook secret shown with the application>
BACKEND_PUBLIC_URL=<this API's public URL, e.g. https://agronexus-api.onrender.com>
WEB_URL=<the web app URL, e.g. https://agro-nexus-gules.vercel.app>
```

RushPay takes precedence over Paystack whenever `RUSHPAY_API_KEY` is set.
Both keys blank → visible "test mode — payment skipped" checkout.

### First-payment smoke test (do this once the key is live)
The public OpenAPI spec doesn't document two details, so verify them with one
small real payment and adjust if needed:
- the exact field name of the widget session token (`backend` passes the whole
  session object through; `web/src/pages/checkout/Checkout.tsx` tries
  `widget_session_token` / `session_token` / `token`)
- the status strings returned by `GET /merchant/payments/status`
  (`backend/src/services/rushpay.ts` → `classifyStatus`, currently permissive)
- then wire `RUSHPAY_WEBHOOK_SECRET` into signature verification in
  `rushpayWebhook` (today the webhook is safe regardless — it never trusts the
  payload, it re-checks status server-side before settling).

---

## 3. The webhook URL to give RushPay

The endpoint is **`/api/v1/payments/webhook/rushpay`** on the backend.

- **Production (use this in the RushPay dashboard):**
  `https://<your-render-backend>/api/v1/payments/webhook/rushpay`
  e.g. `https://agronexus-api.onrender.com/api/v1/payments/webhook/rushpay`
  (deploy the backend to Render first — §5 — then paste the real hostname)

- **Local testing:** RushPay cannot reach `localhost`. Tunnel it:
  ```bash
  ngrok http 3001
  ```
  then use `https://<random>.ngrok-free.app/api/v1/payments/webhook/rushpay`
  and set `BACKEND_PUBLIC_URL` to the same ngrok origin while testing.

The same URL is sent automatically as each payment's `callback_url`
(derived from `BACKEND_PUBLIC_URL`), so keep that env var correct in every
environment.

---

## 4. Environment files recap

**backend/.env**
```
SUPABASE_URL=            # already set
SUPABASE_SERVICE_KEY=    # already set
JWT_SECRET=              # already set
FLASK_SERVICE_URL=http://localhost:5000
PORT=3001
PAYSTACK_SECRET_KEY=     # optional fallback gateway
RUSHPAY_API_KEY=         # PRIMARY gateway — paste when approved
RUSHPAY_WEBHOOK_SECRET=
BACKEND_PUBLIC_URL=http://localhost:3001   # Render URL in production
WEB_URL=http://localhost:3000              # Vercel URL in production
FRONTEND_URL=                              # used for password-reset emails
```

**web/.env** — `VITE_API_URL` (+ Supabase anon keys). In Vercel set
`VITE_API_URL` to the Render backend URL.

**mobile** — `mobile/lib/config/constants.dart` → `baseUrl` currently points
at a LAN IP (`http://172.20.10.7:3001`). Change it to your machine's LAN IP
when testing on a device, or to the Render URL for a production build.

---

## 5. Deployment (Phase 10)

| Service | Platform | Steps |
|---|---|---|
| Backend | Render (Node) | build `npm install && npm run build`, start `npm start`, health check `/api/v1/health`; set ALL backend env vars above |
| ML | Render (Docker) | python:3.10-slim; health `/health` |
| Web | Vercel | set `VITE_API_URL` to the Render URL; SPA rewrite already in `vercel.json` |

After deploying: update backend CORS to allow the Vercel domain, then paste
the Render URL into the RushPay dashboard webhook field (§3).

---

## 6. Mobile app — one-time refresh

```bash
cd mobile
flutter pub get      # registers the newly bundled Mulish fonts
flutter run
```

Now bundled/working out of the box: Mulish (400–800 + italic), green-dominant
dark mode following the device setting, alternating white/green band home
screen, new logo assets.

---

## 7. Optional / nice-to-have

- **Paralucent** (web display font): drop licensed `Paralucent-Variable.woff2`
  into `web/public/fonts/` — zero code changes needed.
- **ML retraining on live data:** `cd backend && npm run export:demand` and
  `npm run export:interest`, then retrain (`ml/train.py`) and redeploy ML +
  `ml/app.py` together.
