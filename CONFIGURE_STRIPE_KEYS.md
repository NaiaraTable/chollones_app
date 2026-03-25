# 🔧 Configure Stripe Keys & Test API

## Problem
You're getting a 500 error from the API because Stripe keys are not configured.

## Solution: Add Your Stripe Test Keys (3 steps)

### Step 1: Get Test Keys from Stripe
1. Go to https://dashboard.stripe.com/
2. Sign in (or create account)
3. Enable **Test Mode** (toggle in top right)
4. Click **Developers** → **API keys**
5. Copy the **Secret Key** (starts with `sk_test_`)

**Example:** `sk_test_51234567890abcdef1234567890`

### Step 2: Add Key to Backend Configuration
Edit `/api/config.php` and find this section (around line 190):

```php
// ======================================================
// STRIPE CONFIGURATION
// ======================================================
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_placeholder');
```

**Replace with your actual key:**
```php
define('STRIPE_SECRET_KEY', 'sk_test_51234567890abcdef1234567890');
```

Save the file. ✅

### Step 3: Add Public Key to Frontend
Edit `/src/app/services/stripe.service.ts` and find (~line 11):

```typescript
private stripePublicKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
```

Get your **Publishable Key** from Stripe dashboard (starts with `pk_test_`) and replace:

```typescript
private stripePublicKey = 'pk_test_51234567890abcdef1234567890';
```

Save the file. ✅

### Step 4: Rebuild App
```powershell
ionic build --prod
```

---

## Test the API Configuration

**Option A: Browser Test**
Visit: `http://localhost:8000/api/procesar-pago.php?action=debug`

You should see:
```json
{
  "status": "ok",
  "stripe_configured": true,
  "stripe_key_preview": "sk_test_123456789abcde...",
  ...
}
```

If `stripe_configured` is `false`, your key is not set correctly.

**Option B: Check API Status**
Visit: `http://localhost:8000/api-status.php`

Shows database, extensions, and Stripe configuration.

---

## How to Know It's Working

1. **PHP Server Running** (port 8000):
   ```
   Listening on http://localhost:8000
   ```

2. **Stripe Keys Configured**:
   - `/api/config.php` has actual `sk_test_...` key
   - `stripe.service.ts` has actual `pk_test_...` key

3. **App Rebuilt**:
   ```
   ionic build --prod
   ```

4. **Dev Server Running** (port 8100):
   ```
   ✔ ng serve compiled successfully
   ```

5. **Test Payment**:
   - Open app on `localhost:8100`
   - Add products to cart
   - Click "Pagar ahora"
   - Should see payment form (no errors)

---

## Common Issues

### "Stripe no está configurado" error
**Cause:** Keys not set in `/api/config.php`  
**Fix:** Add your actual `sk_test_...` key (from step 1-2)

### "Unexpected end of JSON input" error
**Cause:** API returned empty response or HTML error  
**Fix:** Check PHP server is running and has correct port in `proxy.conf.json`

### "Failed to load resource" 404 error
**Cause:** PHP server not running on port 8000  
**Fix:** Start PHP server: `php -S localhost:8000`

### Still seeing errors?
1. Run both servers in separate terminals:
   - Terminal 1: `php -S localhost:8000`
   - Terminal 2: `ionic serve`
2. Clear browser cache: `Ctrl+Shift+Delete`
3. Check browser console (F12) for specific error message
4. Visit `http://localhost:8000/api-status.php` to diagnose

---

## Next Steps After Configuration

1. ✅ Add Stripe keys
2. ✅ Rebuild app
3. ✅ Test payment page loads
4. ✅ Test with card: `4242 4242 4242 4242`
5. ✅ Verify order in WordPress Admin

---

**All set?** Try clicking "Pagar ahora" in the cart. Payment form should appear! 🎉
