<?php
// ======================================================
// API DE ÓRDENES DOKAN (WooCommerce + Dokan)
// ======================================================

// CORS headers are managed by .htaccess, not here
header('Content-Type: application/json; charset=utf-8', true);

// Responder inmediatamente a las peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Capturar errores para asegurar que CORS siempre se envía
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $errstr]);
    exit();
});

require_once __DIR__ . '/config.php';

$db = getDB();
$prefix = TABLE_PREFIX;
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'crear':
        crearOrdenDokan($db, $prefix);
        break;
    case 'get':
        obtenerOrden($db, $prefix);
        break;
    case 'webhook':
        procesarWebhookDokan($db, $prefix);
        break;
    default:
        jsonError('Acción no válida');
}

// -------------------------------------------------------
// POST /dokan-orden.php?action=crear
// Body: {
//   "articulos": [
//     { "chollo_id": "...", "cantidad": 2, "precio": 10.5 },
//     ...
//   ],
//   "total": 50.00,
//   "metodo_pago": "dokan_gateway" // Gateway de Dokan
// }
// -------------------------------------------------------
function crearOrdenDokan(PDO $db, string $prefix): void
{
    try {
        $auth = requireAuth();
        $userId = $auth['user_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $articulos = $input['articulos'] ?? [];
        $total = floatval($input['total'] ?? 0);
        $metodoPago = $input['metodo_pago'] ?? 'dokan_gateway';

        if (empty($articulos) || $total <= 0) {
            jsonError('Datos de la orden inválidos');
        }

        // Obtener datos del usuario - SIMPLIFICADO
        try {
            $userStmt = $db->prepare("SELECT user_email, display_name FROM {$prefix}users WHERE ID = :id LIMIT 1");
            $userStmt->execute(['id' => $userId]);
            $userData = $userStmt->fetch();

            if (!$userData) {
                // Usar valores por defecto si no se encuentra el usuario
                $userData = [
                    'user_email' => 'customer@chollones.local',
                    'display_name' => 'Customer ' . $userId
                ];
            }
        } catch (Exception $e) {
            error_log('Error obteniendo usuario: ' . $e->getMessage());
            $userData = [
                'user_email' => 'customer@chollones.local',
                'display_name' => 'Customer ' . $userId
            ];
        }

        $db->beginTransaction();

        // Crear post de orden de WooCommerce - SIMPLIFICADO
        $numeroOrden = 'ORD-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 8);
        $nombrePost = sanitize_title($numeroOrden);

        $ordenStmt = $db->prepare("
            INSERT INTO {$prefix}posts (
                post_author,
                post_date,
                post_date_gmt,
                post_content,
                post_title,
                post_status,
                comment_status,
                ping_status,
                post_password,
                post_name,
                to_ping,
                pinged,
                post_modified,
                post_modified_gmt,
                post_content_filtered,
                post_parent,
                guid,
                menu_order,
                post_type,
                post_mime_type,
                comment_count
            ) VALUES (
                :post_author,
                NOW(),
                NOW(),
                '',
                :post_title,
                'wc-pending',
                'closed',
                'closed',
                '',
                :post_name,
                '',
                '',
                NOW(),
                NOW(),
                '',
                0,
                '',
                0,
                'shop_order',
                '',
                0
            )
        ");

        $ordenStmt->execute([
            'post_author' => $userId,
            'post_title' => $numeroOrden,
            'post_name' => $nombrePost
        ]);

        $ordenId = intval($db->lastInsertId());

        // Agregar metadatos esenciales de WooCommerce
        $metaDatos = [
            '_customer_user' => $userId,
            '_order_key' => uniqid('wc_order_'),
            '_billing_first_name' => $userData['display_name'],
            '_billing_email' => $userData['user_email'],
            '_order_currency' => 'EUR',
            '_order_total' => strval($total),
            '_order_tax' => '0',
            '_order_shipping' => '0',
            '_payment_method' => $metodoPago,
            '_payment_method_title' => 'Dokan Payment'
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
                error_log('Error agregando meta ' . $key . ': ' . $e->getMessage());
            }
        }

        // Agregar ítems de la orden
        foreach ($articulos as $articulo) {
            try {
                agregarItemOrden($db, $prefix, $ordenId, $articulo);
            } catch (Exception $e) {
                error_log('Error agregando item: ' . $e->getMessage());
            }
        }

        $db->commit();

        // Devolver datos de la orden creada
        jsonResponse([
            'id' => $ordenId,
            'numero_orden' => $numeroOrden,
            'estado' => 'wc-pending',
            'total' => $total,
            'metodo_pago' => $metodoPago,
            'fecha_creacion' => date('Y-m-d H:i:s'),
            'url_pago' => SITE_URL . '/checkout/order-pay/' . $ordenId . '/?pay_for_order=true&key=' . md5($ordenId)
        ], 201);

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en crearOrdenDokan: ' . $e->getMessage());
        jsonError('Error al crear la orden: ' . $e->getMessage(), 500);
    }
}

// -------------------------------------------------------
// Helper: Agregar item a la orden de WooCommerce
// -------------------------------------------------------
function agregarItemOrden(PDO $db, string $prefix, int $ordenId, array $articulo): void
{
    $cholloId = $articulo['chollo_id'] ?? null;
    $cantidad = intval($articulo['cantidad'] ?? 1);
    $precio = floatval($articulo['precio'] ?? 0);

    // Obtener datos del producto
    $prodStmt = $db->prepare("
        SELECT ID, post_title FROM {$prefix}posts
        WHERE ID = :id AND post_type = 'product'
    ");
    $prodStmt->execute(['id' => $cholloId]);
    $producto = $prodStmt->fetch();

    if (!$producto) {
        return; // Producto no encontrado
    }

    // Crear item de orden
    $itemStmt = $db->prepare("
        INSERT INTO {$prefix}woocommerce_order_items (
            order_id,
            order_item_name,
            order_item_type
        ) VALUES (
            :order_id,
            :order_item_name,
            'line_item'
        )
    ");

    $itemStmt->execute([
        'order_id' => $ordenId,
        'order_item_name' => $producto['post_title']
    ]);

    $itemId = intval($db->lastInsertId());

    // Agregar metadatos del item
    $metaItems = [
        '_product_id' => $cholloId,
        '_variation_id' => 0,
        '_qty' => $cantidad,
        '_line_subtotal' => $precio * $cantidad,
        '_line_subtotal_tax' => 0,
        '_line_total' => $precio * $cantidad,
        '_line_tax' => 0,
        '_line_tax_data' => json_encode(['subtotal' => [], 'total' => []]),
    ];

    foreach ($metaItems as $key => $value) {
        $metaItemStmt = $db->prepare("
            INSERT INTO {$prefix}woocommerce_order_itemmeta (
                order_item_id,
                meta_key,
                meta_value
            ) VALUES (
                :order_item_id,
                :meta_key,
                :meta_value
            )
        ");

        $metaItemStmt->execute([
            'order_item_id' => $itemId,
            'meta_key' => $key,
            'meta_value' => $value
        ]);
    }
}

// -------------------------------------------------------
// GET /dokan-orden.php?action=get&id=X
// -------------------------------------------------------
function obtenerOrden(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];
    $ordenId = $_GET['id'] ?? null;

    if (!$ordenId) {
        jsonError('ID de orden es obligatorio');
    }

    $stmt = $db->prepare("
        SELECT
            p.ID as id,
            p.post_title as numero_orden,
            p.post_status as estado,
            p.post_date as fecha_creacion,
            MAX(CASE WHEN pm.meta_key = '_order_total' THEN pm.meta_value END) as total,
            MAX(CASE WHEN pm.meta_key = '_payment_method_title' THEN pm.meta_value END) as metodo_pago,
            MAX(CASE WHEN pm.meta_key = '_transaction_id' THEN pm.meta_value END) as id_transaccion
        FROM {$prefix}posts p
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE p.ID = :id AND p.post_type = 'shop_order' AND p.post_author = :user_id
        GROUP BY p.ID
    ");

    $stmt->execute(['id' => $ordenId, 'user_id' => $userId]);
    $orden = $stmt->fetch();

    if (!$orden) {
        jsonError('Orden no encontrada', 404);
    }

    jsonResponse($orden);
}

// -------------------------------------------------------
// POST /dokan-orden.php?action=webhook
// Procesar webhooks de Dokan (pagos confirmados, etc.)
// -------------------------------------------------------
function procesarWebhookDokan(PDO $db, string $prefix): void
{
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $evento = $input['event'] ?? null;
    $ordenId = $input['order_id'] ?? null;

    if (!$evento || !$ordenId) {
        jsonError('Datos de webhook inválidos');
    }

    switch ($evento) {
        case 'payment_complete':
            // Actualizar estado de orden a completada
            $updateStmt = $db->prepare("
                UPDATE {$prefix}posts
                SET post_status = 'wc-completed'
                WHERE ID = :id AND post_type = 'shop_order'
            ");
            $updateStmt->execute(['id' => $ordenId]);

            // Actualizar el historial si existe
            $historialStmt = $db->prepare("
                UPDATE {$prefix}app_historial
                SET estado = 'completada'
                WHERE numero_pedido = (
                    SELECT post_title FROM {$prefix}posts WHERE ID = :id
                )
            ");
            $historialStmt->execute(['id' => $ordenId]);

            jsonResponse(['mensaje' => 'Orden marcada como completada']);
            break;

        case 'payment_failed':
            // Marcar como fallida
            $updateStmt = $db->prepare("
                UPDATE {$prefix}posts
                SET post_status = 'wc-failed'
                WHERE ID = :id AND post_type = 'shop_order'
            ");
            $updateStmt->execute(['id' => $ordenId]);

            jsonResponse(['mensaje' => 'Orden marcada como fallida']);
            break;

        default:
            jsonError('Evento no soportado');
    }
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function sanitize_title(string $title): string
{
    $title = strtolower($title);
    $title = preg_replace('/[^\w\s-]/', '', $title);
    $title = preg_replace('/[\s-]+/', '-', $title);
    $title = trim($title, '-');
    return $title;
}
