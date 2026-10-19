# PhonePe Standard Checkout setup

This implementation uses PhonePe Standard Checkout V2. V2 creates hosted checkout sessions at `/checkout/v2/pay`, authenticates API requests with an OAuth bearer token, and checks the order through `/checkout/v2/order/{merchantOrderId}/status`. It does not use the legacy `/pg/v1/pay` X-VERIFY checksum.

See PhonePe’s current [authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [create payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), and [order status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status) documentation.

## Configure Firebase Functions

Create these Firebase Functions secrets with credentials from PhonePe Developer Settings:

```text
PHONEPE_CLIENT_ID
PHONEPE_CLIENT_SECRET
```

Set secrets with Firebase CLI, entering each value when prompted:

```sh
firebase functions:secrets:set PHONEPE_CLIENT_ID
firebase functions:secrets:set PHONEPE_CLIENT_SECRET
```

Copy `.env.example` to `.env.<firebase-project-id>` inside this directory and set:

- `PHONEPE_ENV`: `SANDBOX` for UAT or `PRODUCTION` after PhonePe enables live credentials.
- `PHONEPE_CLIENT_VERSION`: client version supplied by PhonePe (commonly `1`).
- `PHONEPE_BASE_URL`: the exact environment base URL from the example; the function rejects a URL that does not match the selected environment.
- `PHONEPE_MERCHANT_ID`: optional; only set when PhonePe requires the partner merchant header.
- `PUBLIC_APP_URL`: the canonical public site URL used for the PhonePe return URL.
- `ADMIN_NOTIFICATION_EMAILS`: comma-separated admin recipients for booking alerts. This provides an email fallback if the Firestore admin settings document is temporarily missing; customer booking emails still go to the account email.

The functions derive the amount from the selected service price in `settings/website`, lock the selected slot during checkout, and create the consultation only after the server verifies a completed order and matching amount with PhonePe. Payment credentials are never exposed to the browser.

## Legacy credentials

`PHONEPE_SALT_KEY` and `PHONEPE_SALT_INDEX` belong to the legacy V1 checksum API and are intentionally not used by this V2 integration. Obtain the V2 client ID, client secret, and client version from PhonePe. Do not place any payment secrets in Vercel or `VITE_*` variables.

## Sandbox and production

Use PhonePe sandbox credentials with `PHONEPE_ENV=SANDBOX` for UAT. Switch to production only after PhonePe approves the merchant account, the legal pages are public, and the full payment-return and refund flows have been checked. Payment completion is confirmed by the app calling PhonePe's order-status API after the customer returns; no webhook is used.
