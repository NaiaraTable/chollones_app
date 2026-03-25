# 🐛 Stripe Integration - Troubleshooting Guide

## Common Issues & Solutions

### 1. "Stripe not configured" or "STRIPE_SECRET_KEY not found"

**Error Message:**
```
Stripe no está configurado
STRIPE_SECRET_KEY not set
```

**Cause:** Backend cannot access Stripe credentials

**Solution:**
1. Open `/api/config.php`
2. Find the Stripe configuration section (around line 190)
3. Add your test secret key:
   ```php
   define('STRIPE_SECRET_KEY', 'sk_test_XXXXXXXXXXXXX');
   ```
4. Save the file
5. Refresh the app and try again

**Alternative (Recommended for Production):**
Set environment variable in your server:
```bash
# Linux/Mac in .env or .bashrc
export STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXX

# Windows in .env file
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXX
```

---

### 2. Payment Form Not Appearing

**Symptoms:** 
- "Pagar ahora" button clicked, but no modal appears
- Console shows blank screen or error

**Diagnosis:**
Check browser console (F12 > Console tab) for errors

**Solutions:**

**A) Stripe Public Key Not Set**
```
Error: Invalid public key provided.
```
Fix in `/src/app/services/stripe.service.ts` (~line 20):
```typescript
private publishableKey = 'pk_test_YOUR_KEY_HERE';
```

**B) Payment Element Container Not Found**
```
Error: Cannot read property 'appendChild' of null
```
Fix: Ensure `<div id="payment-element"></div>` exists in carrito.page.html

**C) Stripe.js Not Loading**
```
Error: Stripe is not defined
```
Fix: Check that stripe.service.ts is imported in carrito.page.ts:
```typescript
import { StripeService } from '../services/stripe.service';
```

---

### 3. "Invalid public key provided" or Cannot Load Stripe.js

**Cause:** Wrong or placeholder public key in StripeService

**Solution:**
1. Get your public key from Stripe dashboard
2. Edit `/src/app/services/stripe.service.ts`
3. Replace placeholder:
   ```typescript
   // BEFORE (wrong)
   private publishableKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
   
   // AFTER (correct)
   private publishableKey = 'pk_test_123456789abcdef';
   ```
4. Rebuild the app: `ionic build --prod`

---

### 4. Payment Fails with "Intent not found in Stripe"

**Error:**
```
Intent no encontrado en Stripe
```

**Cause:** Intent ID doesn't exist or belongs to different Stripe account

**Solution:**
1. Verify you're using test keys:
   - Public key should start with `pk_test_`
   - Secret key should start with `sk_test_`
2. Don't mix test and live keys
3. Check Stripe dashboard that both keys belong to same account
4. Verify Payment Intent was created (check app_pagos table in DB)

**Debug:**
```sql
-- Check if intent was created
SELECT * FROM fxuztb_app_pagos ORDER BY id DESC LIMIT 1;
```

---

### 5. "The payment was not completed successfully" / Wrong Amount Error

**Error:**
```
El pago no fue completado. Estado: requires_payment_method
El monto no coincide con el payment intent
```

**Causes:**
- Payment not actually processed (user canceled)
- Amount mismatch between frontend and Stripe
- Test card used incorrectly

**Solutions:**

**Check Test Card:**
Use `4242 4242 4242 4242` (success card) with:
- Any future expiry date (e.g., 12/25)
- Any 3-digit CVC (e.g., 123)

**Verify Amount:**
```javascript
// In browser console, check amount is in cents
Total: €59.98 → Stripe should receive: 5998 (cents)
```

**Check Payment Status:**
```sql
-- Verify intent was created and amount
SELECT stripe_intent_id, monto, estado FROM fxuztb_app_pagos 
WHERE estado = 'intento_creado' ORDER BY id DESC LIMIT 1;
```

---

### 6. Cart Not Clearing After Payment

**Symptom:** 
- Payment succeeds
- User is not redirected to historial
- Cart still shows items

**Cause:** Error during cleanup or redirect

**Solution:**
Check browser console for JavaScript errors:
1. Open DevTools (F12 > Console)
2. Look for red error messages
3. Check network tab for failed requests

**Manual Cleanup:**
If error persists, manually clear cart:
```javascript
// Browser console
localStorage.removeItem('cart');
location.href = '/tabs/historial';
```

---

### 7. Order Not Appearing in WooCommerce

**Symptom:**
- Payment succeeds in app
- No order in WordPress Admin > WooCommerce > Orders

**Cause:** Permission error or table structure mismatch

**Solution:**

**Check Database:**
```sql
-- Verify shop_order was created
SELECT * FROM fxuztb_posts WHERE post_type = 'shop_order' ORDER BY ID DESC LIMIT 5;

-- Check order items
SELECT * FROM fxuztb_postmeta WHERE meta_key LIKE '_order%' LIMIT 10;
```

**Check Permissions:**
Ensure your WordPress database user has INSERT/UPDATE permissions on:
- `wp_posts` table
- `wp_postmeta` table
- `wp_woocommerce_order_items` table

**Check Table Structure:**
```sql
-- Verify required tables exist
SHOW TABLES LIKE 'fxuztb_posts';
SHOW TABLES LIKE 'fxuztb_postmeta';
```

---

### 8. Authorization / 401 Unauthorized Error

**Error:**
```
ERROR 401 Unauthorized
No autenticado
```

**Cause:** JWT token missing or invalid

**Solution:**
1. Ensure user is logged in
2. Check token is stored in localStorage:
   ```javascript
   // Browser console
   console.log(localStorage.getItem('chollones_token'));
   ```
3. Token format should be: `Bearer eyJhbGc...`
4. Verify token hasn't expired (JWT valid for 7 days)

**Debug Token:**
```javascript
// Browser console - decode JWT
const token = localStorage.getItem('chollones_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires at:', new Date(payload.exp * 1000));
```

---

### 9. CORS Error / OPTIONS Request Fails

**Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:** Server not returning proper CORS headers

**Solution:**
Verify `/api/procesar-pago.php` has CORS headers at the top:
```php
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization', true);
```

These should be copied from another working API file like `/api/carrito.php`

---

### 10. "Webhook signature verification failed"

**Error:**
```
Webhook signature verification failed
```

**Cause:** Webhook secret doesn't match

**Solution - Skip for Now:**
Webhooks are optional for MVP. Only needed if you implement real-time order updates.

For production:
1. Get webhook secret from Stripe dashboard
2. Add to `/api/config.php`:
   ```php
   define('STRIPE_WEBHOOK_SECRET', 'whsec_XXXXXXXXXXXXX');
   ```

---

### 11. Images Not Loading in Order Summary

**Symptom:**
- Payment form shows but images break
- Placeholder appears instead

**Cause:** Image URL stored incorrectly in carrito

**Solution:**
Images are optional - the payment will still work. If you want to fix:
1. Verify chollos table has `imagen_url` field
2. Check URLs are absolute (start with http:// or https://)
3. Test image directly in browser

---

### 12. Payment Form Shows but "Pagar" Button Disabled

**Symptom:**
- Payment form appears
- "Pagar" button is grayed out (disabled)
- Cannot click to submit payment

**Cause:** `clientSecret` not loaded properly

**Solution:**
1. Check network tab in DevTools (F12 > Network)
2. Look for POST to `procesar-pago.php?action=crear-intent`
3. Should return `client_secret` in response
4. If request fails, check earlier errors (#1-8)

---

### 13. Test Card Declined Unexpectedly

**Error in Payment Form:**
```
Your card was declined
```

**Cause:** Using wrong test card or expired test card

**Solution:**
Use correct test card:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000000000000002` (use this only to test error handling)

Expiry should be ANY future date (e.g., today + 1 year)

---

### 14. TypeError: Cannot read property 'elements' of undefined

**Error:**
```
Cannot read property 'elements' of undefined
Cannot read property 'create' of undefined
```

**Cause:** Stripe.js not loaded before Payment Element creation

**Solution:**
The StripeService handles this, but check:
1. Network tab shows `js.stripe.com` loading successfully
2. No CSP (Content Security Policy) blocking stripe.com
3. Public key is correct (not placeholder text)

---

## Debugging Checklist

Before reporting an issue, verify:

- [ ] Stripe test keys obtained from dashboard
- [ ] Keys added to `/api/config.php` or environment
- [ ] Frontend app rebuilt after config changes (`ionic build`)
- [ ] Browser cache cleared
- [ ] Logged in with valid user account
- [ ] Test payment attempted (not real card)
- [ ] Network tab shows successful API calls
- [ ] No JavaScript errors in console
- [ ] Database tables exist (`wp_posts`, `wp_postmeta`)
- [ ] Database user has INSERT permissions

---

## Getting Help

### Check Logs
**Browser Console (F12):**
- JavaScript errors
- Network request failures
- Payment form initialization

**Server Error Log:**
```bash
# Usually in Apache/PHP error log
tail -f /var/log/php-errors.log
tail -f /var/log/apache2/error.log
```

**Database Query Log (Optional):**
```sql
-- Show last 10 payment attempts
SELECT * FROM fxuztb_app_pagos ORDER BY id DESC LIMIT 10;

-- Show last 10 orders
SELECT * FROM fxuztb_posts WHERE post_type='shop_order' ORDER BY ID DESC LIMIT 10;
```

### Contact Stripe Support
If issue is with Stripe itself:
- Visit [Stripe Dashboard](https://dashboard.stripe.com/)
- Open Activity > API Logs to see request/response details
- Contact Stripe support through dashboard

---

**Last Updated:** January 2025  
**Stripe API Version:** v3 (latest)
