<?php
// ======================================================
// API DE PROCESAMIENTO DE PAGOS (Stripe + Google Pay)
// ======================================================

// CORS headers are managed by .htaccess, not here
header('Content-Type: application/json; charset=utf-8', true);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error[$errno]: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode([
        'error' => 'Error en el servidor',
        'details' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit();
});

require_once __DIR__ . '/config.php';

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    $action = $_GET['action'] ?? 'list';

    switch ($action) {
        case 'debug':
            debugStatus();
            break;
        case 'crear-intent':
            crearPaymentIntent($db, $prefix);
            break;
        case 'confirmar-pago':
            confirmarPago($db, $prefix);
            break;
        case 'webhook':
            procesarWebhookStripe($db, $prefix);
            break;
        default:
            jsonError('Acción no válida');
    }
} catch (Exception $e) {
    error_log("PROCESAR-PAGO ERROR: " . $e->getMessage() . " | " . $e->getFile() . ":" . $e->getLine());
    jsonError('Error: ' . $e->getMessage(), 500);
}

// -------------------------------------------------------
// GET /procesar-pago.php?action=debug
// 
// Verifica la configuración de Stripe
// -------------------------------------------------------
function debugStatus(): void
{
    $stripeKey = defined('STRIPE_SECRET_KEY') ? STRIPE_SECRET_KEY : getenv('STRIPE_SECRET_KEY');
    $isConfigured = !empty($stripeKey) && $stripeKey !== 'sk_test_placeholder';
    
    jsonResponse([
        'status' => 'ok',
        'stripe_configured' => $isConfigured,
        'stripe_key_preview' => empty($stripeKey) ? 'NOT SET' : substr($stripeKey, 0, 23) . '...',
        'php_version' => phpversion(),
        'curl_enabled' => extension_loaded('curl'),
        'pdo_enabled' => extension_loaded('pdo'),
        'mysql_enabled' => extension_loaded('pdo_mysql'),
        'db_host' => DB_HOST,
        'db_name' => DB_NAME,
        'instructions' => [
            'If stripe_configured is false:',
            '1. Get test keys from https://dashboard.stripe.com/',
            '2. Add to /api/config.php: define("STRIPE_SECRET_KEY", "sk_test_YOUR_KEY");',
            '3. Update /src/app/services/stripe.service.ts with public key',
            '4. Rebuild: ionic build --prod'
        ]
    ]);
}

// -------------------------------------------------------
// POST /procesar-pago.php?action=crear-intent
// Body: { "articulos": [...], "total": 50.00 }
// 
// Crea un Payment Intent en Stripe
// -------------------------------------------------------
function crearPaymentIntent(PDO $db, string $prefix): void
{
    try {
        $auth = requireAuth();
        $userId = $auth['user_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $articulos = $input['articulos'] ?? [];
        $total = floatval($input['total'] ?? 0);

        if (empty($articulos) || $total <= 0) {
            jsonError('Datos inválidos para crear intent de pago');
        }

        // Asegurar que la tabla existe
        ensurePagosTable($db, $prefix);

        // Obtener claves de Stripe (agregar en config.php o .env)
        $stripeSecretKey = defined('STRIPE_SECRET_KEY') ? STRIPE_SECRET_KEY : getenv('STRIPE_SECRET_KEY');
        
        // Validar que la clave está configurada y no es un placeholder
        if (empty($stripeSecretKey) || $stripeSecretKey === 'sk_test_placeholder') {
            jsonResponse([
                'error' => 'Stripe no está configurado',
                'message' => 'Necesitas agregar tu clave secreta de Stripe en /api/config.php',
                'instructions' => 'Ve a https://dashboard.stripe.com/, copia tu sk_test_... y agrega a config.php',
                'debug_status_url' => 'http://localhost:8000/procesar-pago.php?action=debug'
            ], 400);
        }

        // Convertir a centavos (Stripe usa centavos para EUR)
        $amountCents = intval($total * 100);

        // Crear Payment Intent con cURL (sin dependencias)
        $ch = curl_init('https://api.stripe.com/v1/payment_intents');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'amount' => $amountCents,
            'currency' => 'eur',
            'automatic_payment_methods[enabled]' => 'true',
            'metadata[user_id]' => $userId,
            'metadata[articulos_count]' => count($articulos),
            'metadata[timestamp]' => time()
        ]));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if (!empty($curlError)) {
            error_log('Stripe curl error: ' . $curlError);
            jsonError('Error de conexión con Stripe: ' . $curlError, 500);
        }

        if ($httpCode !== 200) {
            error_log('Stripe error (' . $httpCode . '): ' . $response);
            jsonError('Error al crear intención de pago: ' . $response, 402);
        }

        $paymentIntent = json_decode($response, true);

        if (!isset($paymentIntent['client_secret'])) {
            error_log('No client_secret in Stripe response: ' . json_encode($paymentIntent));
            jsonError('No se recibió client_secret de Stripe', 500);
        }

        // Guardar intent temporalmente en BD (opcional, para auditoria)
        try {
            $stmt = $db->prepare("
                INSERT INTO {$prefix}app_pagos (
                    usuario_id,
                    stripe_intent_id,
                    monto,
                    moneda,
                    estado,
                    articulos_count,
                    fecha_creacion
                ) VALUES (
                    :usuario_id,
                    :stripe_intent_id,
                    :monto,
                    :moneda,
                    :estado,
                    :articulos_count,
                    NOW()
                )
            ");

            $stmt->execute([
                'usuario_id' => $userId,
                'stripe_intent_id' => $paymentIntent['id'],
                'monto' => $total,
                'moneda' => 'EUR',
                'estado' => 'intento_creado',
                'articulos_count' => count($articulos)
            ]);
        } catch (Exception $e) {
            error_log('No se pudo guardar intent en BD: ' . $e->getMessage());
            // No es crítico, continuamos
        }

        // Responder con datos para el cliente
        jsonResponse([
            'client_secret' => $paymentIntent['client_secret'],
            'intent_id' => $paymentIntent['id'],
            'monto' => $total,
            'moneda' => 'EUR',
            'status' => $paymentIntent['status']
        ]);

    } catch (Exception $e) {
        error_log('Error en crearPaymentIntent: ' . $e->getMessage() . ' | ' . $e->getFile() . ':' . $e->getLine());
        jsonError('Error: ' . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------
// POST /procesar-pago.php?action=confirmar-pago
// Body: {
//   "stripe_intent_id": "pi_xxxxx",
//   "payment_method_id": "pm_xxxxx",
//   "articulos": [...],
//   "total": 50.00
// }
//
// Confirma el pago y crea orden en WooCommerce
// -------------------------------------------------------
function confirmarPago(PDO $db, string $prefix): void
{
    try {
        $auth = requireAuth();
        $userId = $auth['user_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $stripeIntentId = $input['stripe_intent_id'] ?? null;
        $articulos = $input['articulos'] ?? [];
        $total = floatval($input['total'] ?? 0);

        if (!$stripeIntentId || empty($articulos) || $total <= 0) {
            jsonError('Datos incompletos para confirmar pago');
        }

        // Obtener claves de Stripe
        $stripeSecretKey = defined('STRIPE_SECRET_KEY') ? STRIPE_SECRET_KEY : getenv('STRIPE_SECRET_KEY');
        
        if (empty($stripeSecretKey) || $stripeSecretKey === 'sk_test_placeholder') {
            jsonResponse([
                'error' => 'Stripe no está configurado',
                'message' => 'Necesitas agregar tu clave secreta de Stripe en /api/config.php'
            ], 400);
        }

        // Verificar Payment Intent en Stripe
        $ch = curl_init('https://api.stripe.com/v1/payment_intents/' . $stripeIntentId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $stripeSecretKey . ':');

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            jsonError('Intent no encontrado en Stripe', 404);
        }

        $paymentIntent = json_decode($response, true);

        // Validar que el pago fue exitoso
        if ($paymentIntent['status'] !== 'succeeded') {
            jsonError('El pago no fue completado. Estado: ' . $paymentIntent['status'], 402);
        }

        // Cantidad en la orden debe coincidir
        $amountCents = intval($paymentIntent['amount']);
        $amountEur = $amountCents / 100;
        if (abs($amountEur - $total) > 0.01) {
            jsonError('El monto no coincide con el payment intent');
        }

        $db->beginTransaction();

        // Crear orden en WooCommerce
        $numeroOrden = 'ORD-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 8);
        $nombrePost = sanitize_title($numeroOrden);

        // Obtener datos del usuario
        $userStmt = $db->prepare("SELECT user_email, display_name FROM {$prefix}users WHERE ID = :id");
        $userStmt->execute(['id' => $userId]);
        $userData = $userStmt->fetch() ?? [
            'user_email' => 'customer@chollones.local',
            'display_name' => 'Customer'
        ];

        // Crear post de orden
        $ordenStmt = $db->prepare("
            INSERT INTO {$prefix}posts (
                post_author, post_date, post_date_gmt, post_content,
                post_title, post_status, comment_status, ping_status,
                post_password, post_name, to_ping, pinged,
                post_modified, post_modified_gmt, post_content_filtered,
                post_parent, guid, menu_order, post_type,
                post_mime_type, comment_count
            ) VALUES (
                :post_author, NOW(), NOW(), '',
                :post_title, 'wc-completed', 'closed', 'closed',
                '', :post_name, '', '',
                NOW(), NOW(), '',
                0, '', 0, 'shop_order',
                '', 0
            )
        ");

        $ordenStmt->execute([
            'post_author' => $userId,
            'post_title' => $numeroOrden,
            'post_name' => $nombrePost
        ]);

        $ordenId = intval($db->lastInsertId());

        // Agregar metadatos de WooCommerce
        $metaDatos = [
            '_customer_user' => $userId,
            '_order_key' => uniqid('wc_order_'),
            '_billing_first_name' => $userData['display_name'],
            '_billing_email' => $userData['user_email'],
            '_order_currency' => 'EUR',
            '_order_total' => strval($total),
            '_order_tax' => '0',
            '_order_shipping' => '0',
            '_payment_method' => 'stripe',
            '_payment_method_title' => 'Stripe Payment',
            '_transaction_id' => $stripeIntentId,
            '_stripe_intent_id' => $stripeIntentId,
            '_stripe_charge_id' => $paymentIntent['charges']['data'][0]['id'] ?? '',
            '_date_paid' => current_time('mysql'),
            '_date_completed' => current_time('mysql')
        ];

        foreach ($metaDatos as $key => $value) {
            try {
                $metaStmt = $db->prepare("
                    INSERT INTO {$prefix}postmeta (post_id, meta_key, meta_value)
                    VALUES (:post_id, :meta_key, :meta_value)
                ");
                $metaStmt->execute([
                    'post_id' => $ordenId,
                    'meta_key' => $key,
                    'meta_value' => $value
                ]);
            } catch (Exception $e) {
                error_log('Error meta: ' . $e->getMessage());
            }
        }

        // Agregar items a la orden
        foreach ($articulos as $articulo) {
            agregarItemOrdenWC($db, $prefix, $ordenId, $articulo);
        }

        // Guardar en historial local
        try {
            $histStmt = $db->prepare("
                INSERT INTO {$prefix}app_historial (
                    usuario_id, numero_pedido, total, cantidad_items,
                    estado, fecha_compra
                ) VALUES (
                    :usuario_id, :numero_pedido, :total, :cantidad_items,
                    'completada', NOW()
                )
            ");

            $cantidadItems = array_reduce($articulos, fn($c, $i) => $c + intval($i['cantidad'] ?? 1), 0);

            $histStmt->execute([
                'usuario_id' => $userId,
                'numero_pedido' => $numeroOrden,
                'total' => $total,
                'cantidad_items' => $cantidadItems
            ]);

            $historialId = intval($db->lastInsertId());

            // Agregar items en historial
            foreach ($articulos as $articulo) {
                // Intentar obtener imagen URL de varias formas
                $imagenUrl = null;
                
                // Opción 1: Si viene en el artículo
                if (isset($articulo['imagen_url']) && !empty($articulo['imagen_url'])) {
                    $imagenUrl = $articulo['imagen_url'];
                }
                
                // Opción 2: Obtener del producto original (thumbnail_id)
                if (!$imagenUrl && isset($articulo['chollo_id'])) {
                    $prodStmt = $db->prepare("
                        SELECT p.ID, p.guid,
                               MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
                        FROM {$prefix}posts p
                        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
                        WHERE p.ID = :id
                        GROUP BY p.ID
                    ");
                    $prodStmt->execute(['id' => $articulo['chollo_id']]);
                    $prod = $prodStmt->fetch();
                    
                    // Intentar por thumbnail
                    if ($prod && $prod['thumbnail_id']) {
                        $imagenUrl = getImageUrl($db, $prefix, $prod['thumbnail_id']);
                    }
                    
                    // Opción 3: Usar GUID del producto si existe
                    if (!$imagenUrl && $prod && $prod['guid']) {
                        $imagenUrl = $prod['guid'];
                    }
                    
                    // Opción 4: Buscar attachment directo del producto
                    if (!$imagenUrl && $prod) {
                        $attachStmt = $db->prepare("
                            SELECT guid FROM {$prefix}posts 
                            WHERE post_parent = :parent_id 
                            AND post_type = 'attachment'
                            AND post_mime_type LIKE 'image/%'
                            LIMIT 1
                        ");
                        $attachStmt->execute(['parent_id' => $prod['ID']]);
                        $attach = $attachStmt->fetch();
                        if ($attach && $attach['guid']) {
                            $imagenUrl = $attach['guid'];
                        }
                    }
                }
                
                $itemStmt = $db->prepare("
                    INSERT INTO {$prefix}app_historial_items (
                        historial_id, chollo_id, titulo,
                        precio_unitario, cantidad, subtotal, imagen_url
                    ) VALUES (
                        :historial_id, :chollo_id, :titulo,
                        :precio_unitario, :cantidad, :subtotal, :imagen_url
                    )
                ");

                $cantidad = intval($articulo['cantidad'] ?? 1);
                $precio = floatval($articulo['precio'] ?? 0);
                $subtotal = $precio * $cantidad;

                $itemStmt->execute([
                    'historial_id' => $historialId,
                    'chollo_id' => $articulo['chollo_id'] ?? null,
                    'titulo' => $articulo['titulo'] ?? 'Producto',
                    'precio_unitario' => $precio,
                    'cantidad' => $cantidad,
                    'subtotal' => $subtotal,
                    'imagen_url' => $imagenUrl
                ]);
            }
        } catch (Exception $e) {
            error_log('Error guardando historial: ' . $e->getMessage());
        }

        // Registrar pago en tabla de pagos
        try {
            $pagoStmt = $db->prepare("
                INSERT INTO {$prefix}app_pagos (
                    usuario_id, stripe_intent_id, monto, moneda,
                    estado, fecha_pago
                ) VALUES (
                    :usuario_id, :stripe_intent_id, :monto, :moneda,
                    'pagado', NOW()
                )
            ");

            $pagoStmt->execute([
                'usuario_id' => $userId,
                'stripe_intent_id' => $stripeIntentId,
                'monto' => $total,
                'moneda' => 'EUR'
            ]);
        } catch (Exception $e) {
            error_log('Error registrando pago: ' . $e->getMessage());
        }

        $db->commit();

        // Responder con éxito
        jsonResponse([
            'success' => true,
            'numero_orden' => $numeroOrden,
            'orden_id' => $ordenId,
            'monto' => $total,
            'estado' => 'completada',
            'mensaje' => 'Pago procesado exitosamente'
        ], 200);

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en confirmarPago: ' . $e->getMessage());
        jsonError('Error: ' . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------
// POST /procesar-pago.php?action=webhook
// Webhook de Stripe para confirmar pagos
// -------------------------------------------------------
function procesarWebhookStripe(PDO $db, string $prefix): void
{
    $stripeWebhookSecret = getEnv('STRIPE_WEBHOOK_SECRET') ?? '';
    if (!$stripeWebhookSecret) {
        jsonError('Webhook no configurado', 500);
    }

    // Validar firma del webhook
    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    // Validación simplificada (en producción usar mejor validación)
    $event = json_decode($payload, true);

    if ($event['type'] === 'payment_intent.succeeded') {
        error_log('Webhook: Pago confirmado ' . $event['data']['object']['id']);
        jsonResponse(['received' => true]);
    }

    jsonResponse(['received' => false]);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function agregarItemOrdenWC(PDO $db, string $prefix, int $ordenId, array $articulo): void
{
    try {
        $cholloId = $articulo['chollo_id'] ?? null;
        $cantidad = intval($articulo['cantidad'] ?? 1);
        $precio = floatval($articulo['precio'] ?? 0);
        $titulo = $articulo['titulo'] ?? 'Producto';

        $itemStmt = $db->prepare("
            INSERT INTO {$prefix}woocommerce_order_items (
                order_id, order_item_name, order_item_type
            ) VALUES (
                :order_id, :order_item_name, 'line_item'
            )
        ");

        $itemStmt->execute([
            'order_id' => $ordenId,
            'order_item_name' => $titulo
        ]);

        $itemId = intval($db->lastInsertId());

        // Metadatos del item
        $metaItems = [
            '_product_id' => $cholloId,
            '_qty' => $cantidad,
            '_line_total' => $precio * $cantidad,
            '_line_tax' => 0
        ];

        foreach ($metaItems as $key => $value) {
            $metaStmt = $db->prepare("
                INSERT INTO {$prefix}woocommerce_order_itemmeta (
                    order_item_id, meta_key, meta_value
                ) VALUES (
                    :order_item_id, :meta_key, :meta_value
                )
            ");

            $metaStmt->execute([
                'order_item_id' => $itemId,
                'meta_key' => $key,
                'meta_value' => $value
            ]);
        }
    } catch (Exception $e) {
        error_log('Error en agregarItemOrdenWC: ' . $e->getMessage());
    }
}

function sanitize_title(string $title): string
{
    $title = strtolower($title);
    $title = preg_replace('/[^\w\s-]/', '', $title);
    $title = preg_replace('/[\s-]+/', '-', $title);
    return trim($title, '-');
}

function current_time(string $type = 'mysql'): string
{
    if ($type === 'mysql') {
        return date('Y-m-d H:i:s');
    }
    return date('Y-m-d');
}

function ensurePagosTable(PDO $db, string $prefix): void
{
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS {$prefix}app_pagos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id BIGINT NOT NULL,
                stripe_intent_id VARCHAR(255) NOT NULL,
                monto DECIMAL(10, 2),
                moneda VARCHAR(3) DEFAULT 'EUR',
                estado VARCHAR(50) DEFAULT 'pendiente',
                articulos_count INT DEFAULT 0,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_intent (stripe_intent_id),
                KEY idx_usuario (usuario_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    } catch (Exception $e) {
        error_log('Error creating app_pagos table: ' . $e->getMessage());
        // No es crítico, puede existir ya
    }
}

function getImageUrl(PDO $db, string $prefix, ?string $thumbnailId): ?string
{
    if (!$thumbnailId)
        return null;

    // Intentar obtener la URL de la imagen del attachment
    $stmt = $db->prepare("
        SELECT pm.meta_value
        FROM {$prefix}postmeta pm
        WHERE pm.post_id = :id AND pm.meta_key = '_wp_attached_file'
    ");
    $stmt->execute(['id' => $thumbnailId]);
    $file = $stmt->fetchColumn();

    if ($file) {
        return SITE_URL . '/wp-content/uploads/' . $file;
    }

    // Fallback: usar guid del post
    $stmt = $db->prepare("SELECT guid FROM {$prefix}posts WHERE ID = :id");
    $stmt->execute(['id' => $thumbnailId]);
    return $stmt->fetchColumn() ?: null;
}
