# ⚡ Quick Start - 5 Minute Setup

## ⏱️ Estimated Time: 5 minutes

Complete these steps in order to enable Stripe payments in your app.

---

## ✅ Step 1: Get Stripe Test Keys (2 minutes)

1. Go to: https://dashboard.stripe.com/
2. **Sign in or create account** (free)
3. **Enable Test Mode** - Toggle in top right corner
4. Click **Developers** menu (left sidebar)
5. Click **API Keys**
6. **Copy your test keys:**
   - Find "Publishable key (starts with pk_test_)"
   - Find "Secret key (starts with sk_test_)"
   - ⚠️ Keep secret key private!

**Example:**
```
Publishable Key: pk_test_51234567890abcdef...
Secret Key:      sk_test_51234567890abcdef...
```

---

## ✅ Step 2: Configure Backend (1 minute)

1. Open file: `api/config.php`
2. Find this section near the end:
   ```php
   // ======================================================
   // STRIPE CONFIGURATION
   // ======================================================
   ```
3. Replace the placeholder with your **Secret Key**:
   ```php
   define('STRIPE_SECRET_KEY', 'sk_test_YOUR_KEY_HERE');
   ```
4. **Save the file**

Example:
```php
// BEFORE (placeholder):
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_placeholder');

// AFTER (your actual key):
define('STRIPE_SECRET_KEY', 'sk_test_51234567890abcdef123456789');
```

---

## ✅ Step 3: Configure Frontend (1 minute)

1. Open file: `src/app/services/stripe.service.ts`
2. Find this line (~line 20):
   ```typescript
   private publishableKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
   ```
3. Replace with your **Publishable Key**:
   ```typescript
   private publishableKey = 'pk_test_YOUR_KEY_HERE';
   ```
4. **Save the file**

Example:
```typescript
// BEFORE (placeholder):
private publishableKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';

// AFTER (your actual key):
private publishableKey = 'pk_test_51234567890abcdef123456789';
```

---

## ✅ Step 4: Rebuild App (1 minute)

Run in terminal:
```bash
ionic build --prod
```

Wait for build to complete (should take ~1 minute)

---

## ✅ Step 5: Test Payment (Optional, but recommended!)

### Test Using Web Browser

1. **Start dev server:**
   ```bash
   ionic serve
   ```
2. **Navigate to cart** in app
3. **Add products** and click **"Pagar ahora"**
4. **Payment modal opens** with form
5. **Use test card:** `4242 4242 4242 4242`
   - Expiry: **Any future date** (e.g., 12/25)
   - CVC: **Any 3 digits** (e.g., 123)
6. **Click "Pagar"** button
7. **Payment succeeds** → Redirected to purchase history

### Expected Results ✅
- ✅ Payment modal appears without errors
- ✅ Payment form (card input) displays
- ✅ Payment processes in < 3 seconds
- ✅ Success message shows order number
- ✅ Cart clears
- ✅ Redirected to "Mi Compras" (purchase history)
- ✅ Order visible in history with status "Completado"

---

## 🎉 Done!

Your app now accepts Stripe payments!

### What works:
- ✅ Card payments (Visa, Mastercard, Amex)
- ✅ Google Pay (on Android)
- ✅ Apple Pay (on iOS)
- ✅ Orders saved to WordPress
- ✅ Commission tracking via Dokan

### Test Different Scenarios:

| Scenario | Card Number | Result |
|----------|------------|--------|
| **Success** | `4242 4242 4242 4242` | Payment succeeds ✅ |
| **Decline** | `4000000000000002` | Payment fails (test error handling) |
| **Auth Required** | `4000002500003155` | Requires verification |

---

## 🆘 Something Not Working?

Check the **troubleshooting** file for 14+ solutions:
- `STRIPE_TROUBLESHOOTING.md`

Common issues:
- "Stripe not configured" → Check `/api/config.php` secret key
- "Invalid public key" → Check `stripe.service.ts` public key
- "Payment form not showing" → Rebuild app: `ionic build --prod`
- Payment fails silently → Check browser console (F12)

---

## 📚 More Information

**Full Setup Guide:**
- `STRIPE_SETUP.md` - Complete configuration & API docs

**Implementation Details:**
- `IMPLEMENTATION_SUMMARY.md` - Architecture & features

**Troubleshooting:**
- `STRIPE_TROUBLESHOOTING.md` - 14+ solutions

---

## 🚀 Going to Production

When ready for real money:

1. **Get Live Keys** from Stripe (not test keys)
2. **Update `/api/config.php`** with live secret key
3. **Update `stripe.service.ts`** with live public key
4. **Enable HTTPS** (Stripe requires it)
5. **Test with real card** (small amount, e.g., €0.50)
6. **Set up Webhooks** (recommended for production)

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Stripe account created
- [ ] Test keys copied
- [ ] `/api/config.php` updated with secret key
- [ ] `stripe.service.ts` updated with public key
- [ ] App rebuilt: `ionic build --prod`
- [ ] Test payment successful with `4242 4242 4242 4242`
- [ ] Order appears in WordPress WooCommerce Orders
- [ ] Order appears in app purchase history

---

## Questions?

Refer to appropriate documentation:
1. **Setup issues** → `STRIPE_SETUP.md`
2. **Technical problems** → `STRIPE_TROUBLESHOOTING.md`
3. **Architecture/design** → `IMPLEMENTATION_SUMMARY.md`
4. **API reference** → View `/api/procesar-pago.php` comments

---

**Time to working payments: ~5-10 minutes** ⚡
