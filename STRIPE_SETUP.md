# 🔐 Stripe + Google Pay Integration Setup Guide

## Overview

The payment system is now implemented using **Stripe as the payment gateway** with **Google Pay** supported natively through Stripe's Payment Element. Commission tracking is handled by Dokan in WordPress.

### Architecture

```
User App (Ionic/Angular)
    ↓
Stripe.js Payment Element (Card/Google Pay/Apple Pay)
    ↓
/api/procesar-pago.php (Backend validation)
    ↓
Stripe API (Payment Intent verification)
    ↓
WordPress WooCommerce (Order creation)
    ↓
Dokan Plugin (Commission distribution)
```

---

## Quick Start

### 1️⃣ Get Stripe Credentials

1. Visit **[https://dashboard.stripe.com/](https://dashboard.stripe.com/)**
2. Sign in or create an account
3. Enable **Test Mode** (toggle in top right)
4. Navigate to **Developers > API Keys**
5. Copy your keys:
   - **Publishable Key**: `pk_test_XXXXXXXXXXXXX`
   - **Secret Key**: `sk_test_XXXXXXXXXXXXX`

### 2️⃣ Configure Backend

Edit **`/api/config.php`**:

```php
<?php
// ... existing code ...

// Add Stripe configuration
$stripecretKey = 'sk_test_XXXXXXXXXXXXX'; // Replace with your test key

// For production, use environment variables instead:
// define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY'));
```

Alternatively, set environment variable:
```bash
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXX
```

### 3️⃣ Configure Frontend

Edit **`/src/app/services/stripe.service.ts`**:

Find this line (~line 20):
```typescript
private publishableKey = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
```

Replace with your test publishable key:
```typescript
private publishableKey = 'pk_test_XXXXXXXXXXXXX'; // Your actual test key
```

---

## Testing

### Prerequisites
- App running locally or deployed
- Stripe test key configured
- Cart with items ready

### Test Steps

1. **Add products to cart** in the app
2. Click **"Pagar ahora"** (Pay Now)
3. Payment modal appears with Stripe form
4. Choose payment method:
   - **Card**: Enter test card details
   - **Google Pay**: If on Android/browser with Google Pay
   - **Apple Pay**: If on iOS with Apple Pay

### Test Cards

Use these test cards in the payment form:

| Card Type | Number | Expiry | CVC |
|-----------|--------|--------|-----|
| **Visa Success** | `4242 4242 4242 4242` | Any future | Any 3 digits |
| **Visa Decline** | `4000000000000002` | Any future | Any 3 digits |
| **3D Secure Test** | `4000002500003155` | Any future | Any 3 digits |
| **Google Pay** | Use any test card above with Google Pay button |

### Expected Outcome
✅ Payment succeeds → Order created → Redirected to purchase history

---

## API Endpoints

### Create Payment Intent

**POST** `/api/procesar-pago.php?action=crear-intent`

Headers:
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

Body:
```json
{
  "articulos": [
    {
      "chollo_id": 123,
      "titulo": "Product Name",
      "precio": 29.99,
      "cantidad": 2,
      "imagen_url": "..."
    }
  ],
  "total": 59.98
}
```

Response:
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "intent_id": "pi_xxx",
  "monto": 59.98,
  "moneda": "EUR",
  "status": "requires_payment_method"
}
```

### Confirm Payment

**POST** `/api/procesar-pago.php?action=confirmar-pago`

Headers:
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

Body:
```json
{
  "stripe_intent_id": "pi_xxx",
  "articulos": [...],
  "total": 59.98
}
```

Response:
```json
{
  "success": true,
  "numero_orden": "ORD-20250101120000-abc12345",
  "estado": "completada",
  "total": 59.98
}
```

---

## Database Tables

### `app_pagos` (Payment Records)
Stores all Stripe payment attempts:
- `stripe_intent_id` - Stripe Payment Intent ID
- `usuario_id` - Customer user ID
- `monto` - Payment amount
- `estado` - Payment status (intento_creado, completado, fallido)
- `fecha_creacion` - Creation timestamp

### `wp_posts` (WooCommerce Orders)
Creates `shop_order` posts when payment succeeds:
- `post_type` = 'shop_order'
- `post_status` = 'wc-completed'
- Stores order metadata (transaction IDs, customer info, totals)

### `app_historial` (Order History)
Local copy of completed orders:
- `numero_pedido` - Order number
- `usuario_id` - Customer ID
- `total` - Order total
- `estado` = 'completada'
- `fecha_compra` - Purchase date

---

## Production Checklist

Before going live with real payments:

- [ ] Switch Stripe keys from `pk_test_*` and `sk_test_*` to `pk_live_*` and `sk_live_*`
- [ ] Update `/api/config.php` with production keys (or env variables)
- [ ] Update `/src/app/services/stripe.service.ts` with production public key
- [ ] Enable HTTPS (required by Stripe)
- [ ] Set up Stripe webhooks for production (`/api/procesar-pago.php?action=webhook`)
- [ ] Test with real payment methods (small amount)
- [ ] Verify orders appear in WordPress Admin > WooCommerce
- [ ] Verify Dokan commission calculations work correctly
- [ ] Set up email notifications for successful/failed payments
- [ ] Update terms & conditions with payment information

---

## Webhook Setup (Optional but Recommended)

For production, configure Stripe webhooks:

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add Endpoint**
3. Set URL: `https://yourdomain.com/api/procesar-pago.php?action=webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add Endpoint**
6. Copy **Signing Secret** and add to `/api/config.php`:

```php
define('STRIPE_WEBHOOK_SECRET', 'whsec_XXXXXXXXXXXXX');
```

---

## Troubleshooting

### "Stripe not configured" error
- Check Stripe keys are set in `/api/config.php`
- Verify `STRIPE_SECRET_KEY` environment variable is accessible
- Ensure JWT token is valid in Authorization header

### Payment form not showing
- Check browser console for errors
- Verify Stripe public key is correct in `stripe.service.ts`
- Ensure `payment-element` div exists in carrito.page.html

### "Intent not found" error
- Verify Payment Intent ID is correct
- Check that intent was created successfully (check app_pagos table)
- Confirm Stripe keys match (test vs live)

### Commission not showing in Dokan
- Verify Dokan plugin is active in WordPress
- Check that seller/vendor is set up correctly
- Review Dokan settings for commission percentages
- Check WordPress logs for errors

---

## File Reference

| File | Purpose |
|------|---------|
| `/api/procesar-pago.php` | Payment processing endpoint |
| `/api/config.php` | Configuration (add STRIPE_SECRET_KEY) |
| `/src/app/services/stripe.service.ts` | Angular Stripe integration |
| `/src/app/carrito/carrito.page.ts` | Cart with payment modal |
| `/src/app/carrito/carrito.page.html` | Payment form UI |
| `/src/app/carrito/carrito.page.scss` | Payment modal styling |

---

## Support

For issues or questions:
1. Check Stripe error logs in `/api/` (errors logged to system error log)
2. Check browser DevTools Console for client-side errors
3. Review `app_pagos` table for payment attempts
4. Check WordPress error log for WooCommerce/Dokan issues

---

**Status**: ✅ Implementation Complete  
**Last Updated**: January 2025  
**Stripe API Version**: Latest (v3)
