# 💳 Complete Payment Flow - Article Preparation & Processing

## 🎯 Overview
This document details how articles/products are prepared for payment from the shopping cart through to storage in the purchase history.

---

## 📱 FRONTEND FLOW (Angular/Ionic)

### 1. **Articles Loaded from Carrito**
**File:** [src/app/carrito/carrito.page.ts](src/app/carrito/carrito.page.ts)

```typescript
// Line 45-53
async cargarCarrito() {
  this.cargando = true;
  try {
    this.articulos = await this.apiService.getCarrito();
    this.calcularTotal();
  } catch (e) {
    console.error('Error cargando carrito:', e);
  } finally {
    this.cargando = false;
  }
}
```

Each article is loaded with structure:
```typescript
{
  id: string,           // Carrito item ID
  cantidad: number,
  chollos: {
    id: string,
    titulo: string,
    precio_actual: number,
    imagen_url: string,
    proveedores: { nombre: string }
  }
}
```

---

### 2. **Total Calculation**
**File:** [src/app/carrito/carrito.page.ts](src/app/carrito/carrito.page.ts) Line 55-60

```typescript
calcularTotal() {
  this.total = this.articulos.reduce((sum, item) => {
    const precioUnitario = Number(item.chollos?.precio_actual) || 0;
    return sum + (precioUnitario * item.cantidad);
  }, 0);
}
```

---

### 3. **Payment Initiation (pagarAhora)**
**File:** [src/app/carrito/carrito.page.ts](src/app/carrito/carrito.page.ts) Line 113-178

#### Phase 1: Article Preparation
Articles are transformed into payment-ready format:

```typescript
const articulosParaGuardar = this.articulos.map(item => {
  const precio = Number(item.chollos?.precio_actual) || 0;
  return {
    chollo_id: item.chollos?.id,
    titulo: item.chollos?.titulo || 'Producto sin título',
    precio: precio,
    cantidad: Number(item.cantidad) || 1,
    imagen_url: item.chollos?.imagen_url || null
  };
});
```

**Articles sent to Stripe contain:**
- `chollo_id`: Product identifier
- `titulo`: Product title
- `precio`: Unit price (NOT in cents - decimal EUR)
- `cantidad`: Quantity
- `imagen_url`: Product image URL

#### Phase 2: Create Payment Intent with Stripe
```typescript
const intentResponse = await this.stripeService.crearPaymentIntent(
  articulosParaGuardar, 
  this.total
);

this.clientSecret = intentResponse.client_secret;
this.intentId = intentResponse.intent_id;
```

**Sent to:** [POST /api/procesar-pago.php?action=crear-intent](api/procesar-pago.php)

**Payload:**
```json
{
  "articulos": [
    {
      "chollo_id": "123",
      "titulo": "Product Title",
      "precio": 19.99,
      "cantidad": 2,
      "imagen_url": "https://..."
    }
  ],
  "total": 39.98
}
```

#### Phase 3: User sees Payment Element
```typescript
await this.stripeService.crearPaymentElement(this.clientSecret, 'payment-element');
```

---

### 4. **Payment Confirmation (confirmarPago)**
**File:** [src/app/carrito/carrito.page.ts](src/app/carrito/carrito.page.ts) Line 180-248

#### Phase 1: Stripe Validation
```typescript
const stripeResult = await this.stripeService.confirmarPaymentElement(this.clientSecret);

if (stripeResult.paymentIntent?.status !== 'succeeded') {
  throw new Error('El pago no fue procesado correctamente');
}
```

#### Phase 2: Server Confirmation
Articles are sent AGAIN to server with stripe_intent_id:

```typescript
const confirmResponse = await this.confirmarPagoEnServidor(
  this.intentId, 
  articulosParaGuardar, 
  this.total
);
```

**Sent to:** [POST /api/procesar-pago.php?action=confirmar-pago](api/procesar-pago.php)

**Payload:**
```json
{
  "stripe_intent_id": "pi_1234567890",
  "articulos": [
    {
      "chollo_id": "123",
      "titulo": "Product Title",
      "precio": 19.99,
      "cantidad": 2,
      "imagen_url": "https://..."
    }
  ],
  "total": 39.98
}
```

---

## 🔙 BACKEND FLOW (PHP)

### 5. **Create Payment Intent**
**File:** [api/procesar-pago.php](api/procesar-pago.php) Lines 93-200
**Function:** `crearPaymentIntent()`

**What happens:**
1. ✅ Validates user is authenticated
2. ✅ Extracts articulos array and total from request body
3. ✅ Converts total to cents: `$amountCents = intval($total * 100)`
4. ✅ Creates Stripe Payment Intent via cURL:
   ```php
   curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
     'amount' => $amountCents,           // e.g., 3998 for €39.98
     'currency' => 'eur',
     'automatic_payment_methods[enabled]' => 'true',
     'metadata[user_id]' => $userId,
     'metadata[articulos_count]' => count($articulos),  // Number of items
     'metadata[timestamp]' => time()
   ]));
   ```

5. ✅ Stores intent in `app_pagos` table (optional for audit)
   ```php
   INSERT INTO app_pagos (
     usuario_id, stripe_intent_id, monto, moneda, estado, articulos_count, fecha_creacion
   ) VALUES (...)
   ```

**Response to Frontend:**
```json
{
  "client_secret": "pi_12345_secret_abc...",
  "intent_id": "pi_12345",
  "monto": 39.98,
  "moneda": "EUR",
  "status": "requires_payment_method"
}
```

---

### 6. **Confirm Payment**
**File:** [api/procesar-pago.php](api/procesar-pago.php) Lines 205-435
**Function:** `confirmarPago()`

**What happens:**

#### Step 6.1: Verify Intent with Stripe
```php
// Fetch Payment Intent status from Stripe
$ch = curl_init('https://api.stripe.com/v1/payment_intents/' . $stripeIntentId);
curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');
$response = curl_exec($ch);
$paymentIntent = json_decode($response, true);

// Verify payment succeeded
if ($paymentIntent['status'] !== 'succeeded') {
  jsonError('El pago no fue completado. Estado: ' . $paymentIntent['status']);
}

// Verify amount matches (prevent tampering)
$amountCents = intval($paymentIntent['amount']);
$amountEur = $amountCents / 100;
if (abs($amountEur - $total) > 0.01) {
  jsonError('El monto no coincide con el payment intent');
}
```

#### Step 6.2: Create WooCommerce Order
```php
// Generate order number
$numeroOrden = 'ORD-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 8);

// Create post of type 'shop_order'
INSERT INTO wp_posts (
  post_author, post_title, post_status, post_type
) VALUES (
  $userId, $numeroOrden, 'wc-completed', 'shop_order'
)
```

Order metadata stored:
```php
[
  '_customer_user' => $userId,
  '_order_key' => uniqid('wc_order_'),
  '_order_currency' => 'EUR',
  '_order_total' => $total,
  '_payment_method' => 'stripe',
  '_transaction_id' => $stripeIntentId,
  '_stripe_intent_id' => $stripeIntentId,
  '_stripe_charge_id' => $paymentIntent['charges']['data'][0]['id'],
  '_date_paid' => current_time('mysql'),
  '_date_completed' => current_time('mysql')
]
```

#### Step 6.3: Add Articles to WooCommerce Order
```php
foreach ($articulos as $articulo) {
  agregarItemOrdenWC($db, $prefix, $ordenId, $articulo);
}
```

**Function:** `agregarItemOrdenWC()` Lines 480+

For each article:
```php
INSERT INTO wp_woocommerce_order_items (
  order_id, order_item_name, order_item_type
) VALUES ($ordenId, $titulo, 'line_item')

// Then add item metadata
INSERT INTO wp_woocommerce_order_itemmeta (
  order_item_id, meta_key, meta_value
) VALUES 
  ($itemId, '_qty', $cantidad),
  ($itemId, '_line_total', $subtotal),
  ($itemId, '_line_subtotal', $subtotal),
  ($itemId, '_line_tax', '0'),
  ($itemId, '_line_subtotal_tax', '0'),
  ($itemId, '_product_id', $cholloId),
  ($itemId, '_variation_id', '0'),
  ($itemId, '_tax_class', ''),
  ($itemId, 'pa_chollo_id', $cholloId)
```

#### Step 6.4: Save to Local Historial (Purchase History)
```php
INSERT INTO app_historial (
  usuario_id, numero_pedido, total, cantidad_items, estado, fecha_compra
) VALUES (
  $userId, $numeroOrden, $total, $cantidadItems, 'completada', NOW()
)

$historialId = $db->lastInsertId();

// Save individual items
foreach ($articulos as $articulo) {
  INSERT INTO app_historial_items (
    historial_id, chollo_id, titulo, precio_unitario, 
    cantidad, subtotal, imagen_url
  ) VALUES (
    $historialId,
    $articulo['chollo_id'],
    $articulo['titulo'],
    floatval($articulo['precio']),
    intval($articulo['cantidad']),
    $precio * $cantidad,
    $articulo['imagen_url']
  )
}
```

#### Step 6.5: Record Payment in Payment Table
```php
INSERT INTO app_pagos (
  usuario_id, stripe_intent_id, monto, moneda, estado, fecha_pago
) VALUES (
  $userId, $stripeIntentId, $total, 'EUR', 'pagado', NOW()
)
```

#### Step 6.6: Commit Transaction & Respond
```php
$db->commit();

jsonResponse([
  'success' => true,
  'numero_orden' => $numeroOrden,      // e.g., 'ORD-20260325123456-abc1234e'
  'orden_id' => $ordenId,               // WordPress post ID
  'monto' => $total,
  'estado' => 'completada',
  'mensaje' => 'Pago procesado exitosamente'
], 200);
```

---

## 📊 Database Schema Changes

### Articles in Each Table

#### `app_carro` (Shopping Cart)
```sql
id              INT PRIMARY KEY
usuario_id      BIGINT (user)
chollo_id       BIGINT (product)
cantidad        INT DEFAULT 1
creado_en       DATETIME
```

#### `app_pagos` (Payment Records)
```sql
id                      INT PRIMARY KEY
usuario_id              BIGINT
stripe_intent_id        VARCHAR (Stripe PI ID)
monto                   DECIMAL(10,2)
moneda                  VARCHAR(3) 'EUR'
estado                  VARCHAR (intento_creado, pagado)
articulos_count         INT
fecha_creacion          DATETIME
fecha_pago              DATETIME
```

#### `app_historial` (Purchase History)
```sql
id              BIGINT PRIMARY KEY
usuario_id      BIGINT
numero_pedido   VARCHAR(50) UNIQUE (e.g., 'ORD-20260325...')
fecha_compra    DATETIME
total           DECIMAL(10,2)
cantidad_items  INT
estado          VARCHAR (pendiente, completada)
```

#### `app_historial_items` (Purchase Details - MAIN ARTICLE STORAGE)
```sql
id              BIGINT PRIMARY KEY
historial_id    BIGINT FK (app_historial)
chollo_id       BIGINT (product identifier)
titulo          VARCHAR(255)
precio_unitario DECIMAL(10,2)
cantidad        INT
subtotal        DECIMAL(10,2)
imagen_url      TEXT
```

**Key insight:** Articles are snapshot in `app_historial_items` - they contain the PRICE AT TIME OF PURCHASE, not linked to current product database.

#### `wp_woocommerce_order_items` (WooCommerce Storage)
```sql
order_item_id   BIGINT PRIMARY KEY
order_id        BIGINT FK (wp_posts)
order_item_name VARCHAR(255) (product title)
order_item_type VARCHAR (line_item)
```

Items metadata:
- `_qty`: quantity
- `_line_total`: line total (after tax)
- `_line_subtotal`: line subtotal (before tax)
- `_product_id`: chollo_id
- `pa_chollo_id`: chollo_id (custom field)

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CARRITO PAGE - Frontend (Angular/Ionic)                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
          📱 User clicks "Pagar Ahora" button
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. PREPARE ARTICLES (pagarAhora)                                │
│                                                                 │
│  this.articulos.map(item => ({                                 │
│    chollo_id: item.chollos?.id,                                │
│    titulo: item.chollos?.titulo,                               │
│    precio: Number(item.chollos?.precio_actual),                │
│    cantidad: Number(item.cantidad),                            │
│    imagen_url: item.chollos?.imagen_url                        │
│  }))                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CREATE STRIPE PAYMENT INTENT                                 │
│    POST /api/procesar-pago.php?action=crear-intent             │
│                                                                 │
│  Body: {                                                        │
│    articulos: [...],                                           │
│    total: 39.98                                                │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BACKEND: crearPaymentIntent()                                │
│                                                                 │
│  - Extract articulos and total from body                       │
│  - Create Stripe Payment Intent (amount in cents)              │
│  - Store in app_pagos table                                    │
│  - Return client_secret to frontend                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SHOW PAYMENT ELEMENT (Stripe Payment Element UI)            │
│                                                                 │
│  this.stripeService.crearPaymentElement(clientSecret, ...)     │
│                                                                 │
│  User enters card / chooses Google Pay / Apple Pay             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
          👆 User clicks "Confirm" button
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. CONFIRM PAYMENT ELEMENT (confirmarPago)                      │
│                                                                 │
│  - Call stripe.confirmPayment()                                │
│  - Validate with Stripe                                        │
│  - Check status === 'succeeded'                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CONFIRM IN SERVER                                            │
│    POST /api/procesar-pago.php?action=confirmar-pago           │
│                                                                 │
│  Body: {                                                        │
│    stripe_intent_id: "pi_12345",                               │
│    articulos: [...],               ← SENT AGAIN!              │
│    total: 39.98                                                │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. BACKEND: confirmarPago()                                     │
│                                                                 │
│  a) Verify intent with Stripe API                             │
│  b) Create WordPress shop_order post                          │
│  c) Add articles to wp_woocommerce_order_items                │
│  d) Save to app_historial + app_historial_items               │
│  e) Record in app_pagos (estado='pagado')                     │
│  f) Commit transaction                                         │
│                                                                 │
│  Response: {                                                    │
│    success: true,                                              │
│    numero_orden: "ORD-20260325123456-abc1234e",               │
│    orden_id: 5678,                                             │
│    monto: 39.98,                                               │
│    estado: "completada"                                        │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. CLEANUP & REDIRECT                                           │
│                                                                 │
│  - Clear carrito (delete from app_carro)                       │
│  - Show success message                                        │
│  - Close payment modal                                         │
│  - Navigate to /tabs/historial                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Article Field Summary

### Fields SENT during preparation:
```typescript
{
  chollo_id: string,        // Product ID
  titulo: string,           // Product title
  precio: number,           // Price in EUR (decimal, e.g., 19.99)
  cantidad: number,         // Quantity
  imagen_url: string        // Product image URL
}
```

### Fields STORED in database:
**In `app_historial_items`:**
- `id` - Auto-increment
- `historial_id` - Link to purchase
- `chollo_id` - Product ID
- `titulo` - Product title (snapshot)
- `precio_unitario` - Unit price (decimal EUR)
- `cantidad` - Quantity
- `subtotal` - precio_unitario × cantidad
- `imagen_url` - Image URL

**In `wp_woocommerce_order_items`:**
- `order_item_id` - Auto-increment
- `order_id` - Link to order
- `order_item_name` - Product title
- `order_item_type` - 'line_item'

**In `wp_woocommerce_order_itemmeta` (metadata):**
- `_qty` - Quantity
- `_line_total` - Total (with tax)
- `_line_subtotal` - Subtotal (no tax)
- `_product_id` - chollo_id
- `_line_tax` - Tax amount (currently 0)
- `_tax_class` - Tax class

---

## ⚠️ Important Notes

1. **Articles sent TWICE:**
   - Once to Stripe (via `crearPaymentIntent`)
   - Once to confirm (via `confirmarPago`)
   - Same article structure both times

2. **Snapshot in History:**
   - Articles stored in `app_historial_items` are SNAPSHOTS
   - They show prices at time of purchase
   - NOT linked to live product database
   - Future price changes don't affect history

3. **No Tax:**
   - Currently `_line_tax` = 0
   - All amounts are full prices

4. **WooCommerce Integration:**
   - Orders also stored in WooCommerce
   - Both systems have copies of article data
   - WooCommerce is primary for vendor fulfillment

5. **Stripe Integration:**
   - Amount sent in cents: `$total * 100`
   - Amount verified on confirm
   - Prevents accidental/malicious price changes

---

## 🔍 How to Trace Payments

**Find a payment by stripe_intent_id:**
```sql
SELECT * FROM app_pagos WHERE stripe_intent_id = 'pi_123456';
SELECT * FROM wp_postmeta WHERE meta_key = '_stripe_intent_id' AND meta_value = 'pi_123456';
```

**Find articles from a purchase:**
```sql
SELECT * FROM app_historial_items WHERE historial_id = 123;
SELECT * FROM wp_woocommerce_order_items 
  WHERE order_id = (SELECT ID FROM wp_posts WHERE ID = 456);
```

**View complete purchase:**
```sql
SELECT h.*, COUNT(hi.id) as item_count
FROM app_historial h
LEFT JOIN app_historial_items hi ON h.id = hi.historial_id
WHERE h.numero_pedido = 'ORD-20260325...'
GROUP BY h.id;
```

---

## 🚨 Debug Tips

- Check `api/procesar-pago.php?action=debug` for Stripe configuration
- Look at browser console (DevTools) for `💳 [PAGO]` logs
- Check `api/out.txt` or PHP error logs for server-side errors
- Verify `app_historial_items` has correct prices after payment
- Confirm WooCommerce order has all items correctly set
