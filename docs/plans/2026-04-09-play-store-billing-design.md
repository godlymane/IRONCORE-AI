# Play Store Billing Integration — Design Doc

**Date**: 2026-04-09
**App ID**: `com.ironcore.ai`
**Decision**: Remove Razorpay entirely. Google Play Billing only via `cordova-plugin-purchase`.

---

## Problem

The Capacitor app uses Razorpay for payments. Google Play Store policy requires apps to use Google Play Billing for in-app subscriptions. Razorpay will cause rejection.

## Solution

Replace all Razorpay code with Google Play Billing using `cordova-plugin-purchase` (v13+). Single payment path — no platform detection needed.

## Architecture

```
User taps Subscribe
        |
        v
playBillingService.js (cordova-plugin-purchase)
        |
        v
Google Play Purchase Sheet (native UI)
        |
        v
verifyGooglePlayPurchase (Cloud Function)
        |
        v
Firestore: users/{uid}/data/profile.subscription
```

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/services/playBillingService.js` | NEW | Wraps cordova-plugin-purchase: init, register products, purchase, restore |
| `src/services/paymentService.js` | REWRITE | Remove all Razorpay. Expose purchasePlan() via playBillingService |
| `src/context/PremiumContext.jsx` | UPDATE | Remove Razorpay imports, wire to new paymentService |
| `functions/index.js` | MODIFY | Remove createRazorpayOrder + verifyPayment. Add verifyGooglePlayPurchase |
| `functions/package.json` | MODIFY | Remove razorpay deps, add googleapis |
| `firebase.json` | MODIFY | Remove Razorpay CSP headers |

## Files Removed (code only, not file deletion)

- All Razorpay logic from paymentService.js
- createRazorpayOrder Cloud Function
- verifyPayment Cloud Function (Razorpay HMAC version)
- Razorpay SDK script injection
- VITE_RAZORPAY_KEY_ID env references
- Razorpay CSP in firebase.json

## Google Play Product IDs

| Internal Plan ID | Google Play Product ID | Type | Price |
|-----------------|----------------------|------|-------|
| pro_monthly | pro_monthly | SUBS | $9.99/mo |
| pro_yearly | pro_yearly | SUBS | $59.99/yr |
| elite_monthly | elite_monthly | SUBS | $16.99/mo |
| elite_yearly | elite_yearly | SUBS | $99.99/yr |

These must be created in Google Play Console under the app `com.ironcore.ai`.

## Cloud Function: verifyGooglePlayPurchase

1. Receives: purchaseToken, productId (from authenticated client)
2. Calls Google Play Developer API: androidpublisher.purchases.subscriptions.get
3. Validates: purchase is active, belongs to this app
4. Writes subscription to Firestore: users/{uid}/data/profile
5. Returns: subscription data

Requires:
- Google Cloud service account with Play Developer API permissions
- Service account JSON stored as Firebase secret: GOOGLE_PLAY_SERVICE_ACCOUNT

## Firestore Subscription Schema

Same path: `users/{uid}/data/profile.subscription`

```json
{
  "planId": "elite_monthly",
  "tier": "elite",
  "status": "active",
  "startDate": "2026-04-09T...",
  "expiryDate": "2026-05-09T...",
  "paymentProvider": "google_play",
  "purchaseToken": "gpa.xxxx..."
}
```

## Dependencies

### Client (package.json)
- ADD: `cordova-plugin-purchase` (v13+)
- REMOVE: none (Razorpay was loaded via script tag, not npm)

### Functions (functions/package.json)
- ADD: `googleapis` (for Play Developer API)
- REMOVE: razorpay references from secrets

## Google Play Console Setup (manual)

1. Create subscription products with IDs matching table above
2. Set base plans with pricing
3. Create service account in Google Cloud Console
4. Grant service account "View financial data" permission in Play Console
5. Download service account JSON, store as Firebase secret
