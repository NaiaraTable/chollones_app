<?php
// ======================================================
// API DEL CARRITO
// ======================================================

// CORS headers are managed by .htaccess, not here
header('Content-Type: application/json; charset=utf-8', true);

// Responder inmediatamente a las peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Capturar errores para asegurar que CORS always se envía
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor']);
    exit();
});

require_once __DIR__ . '/config.php';

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    $action = $_GET['action'] ?? 'list';

    switch ($action) {
        case 'list':
            getCarrito($db, $prefix);
            break;
        case 'add':
            addToCarrito($db, $prefix);
            break;
        case 'update':
            updateCarrito($db, $prefix);
            break;
        case 'remove':
            removeFromCarrito($db, $prefix);
            break;
        default:
            jsonError('Acción no válida');
    }
} catch (Exception $e) {
    error_log("CARRITO ERROR: " . $e->getMessage() . " | " . $e->getFile() . ":" . $e->getLine());
    jsonError('Error: ' . $e->getMessage(), 500);
}

// -------------------------------------------------------
// GET /carrito.php → Carrito del usuario
// -------------------------------------------------------
function getCarrito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    // Usamos una tabla propia para el carrito de la app
    ensureCarritoTable($db, $prefix);

    $sql = "
        SELECT
            c.id,
            c.cantidad,
            p.ID as chollo_id,
            p.post_title as titulo,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
        FROM {$prefix}app_carro c
        JOIN {$prefix}posts p ON c.chollo_id = p.ID
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE c.usuario_id = :user_id
        GROUP BY c.id, p.ID
        ORDER BY c.creado_en DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute(['user_id' => $userId]);
    $items = $stmt->fetchAll();

    // Formatear igual que Supabase
    $result = [];
    foreach ($items as $item) {
        $result[] = [
            'id' => $item['id'],
            'cantidad' => intval($item['cantidad']),
            'chollos' => [
                'id' => $item['chollo_id'],
                'titulo' => $item['titulo'],
                'precio_actual' => $item['precio_actual'] ? floatval($item['precio_actual']) : null,
                'precio_original' => $item['precio_original'] ? floatval($item['precio_original']) : null,
                'imagen_url' => getImageUrlCart($db, $prefix, $item['thumbnail_id']),
                'proveedores' => getVendorCart($db, $prefix, $item['autor_id']),
            ]
        ];
    }

    jsonResponse($result);
}

// -------------------------------------------------------
// POST /carrito.php?action=add
// Body: { "chollo_id": "...", "cantidad": 1 }
// -------------------------------------------------------
function addToCarrito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $cholloId = $input['chollo_id'] ?? $_GET['chollo_id'] ?? null;
    $cantidad = intval($input['cantidad'] ?? 1);

    if (!$cholloId)
        jsonError('chollo_id es obligatorio');

    ensureCarritoTable($db, $prefix);

    // ¿Ya existe?
    $stmt = $db->prepare("
        SELECT id, cantidad FROM {$prefix}app_carro
        WHERE usuario_id = :uid AND chollo_id = :cid
    ");
    $stmt->execute(['uid' => $userId, 'cid' => $cholloId]);
    $existente = $stmt->fetch();

    if ($existente) {
        $nuevaCantidad = intval($existente['cantidad']) + $cantidad;
        $stmt = $db->prepare("UPDATE {$prefix}app_carro SET cantidad = :cant WHERE id = :id");
        $stmt->execute(['cant' => $nuevaCantidad, 'id' => $existente['id']]);
    }
    else {
        $stmt = $db->prepare("
            INSERT INTO {$prefix}app_carro (usuario_id, chollo_id, cantidad, creado_en)
            VALUES (:uid, :cid, :cant, NOW())
        ");
        $stmt->execute(['uid' => $userId, 'cid' => $cholloId, 'cant' => $cantidad]);
    }

    jsonResponse(['message' => 'Añadido al carrito'], 201);
}

// -------------------------------------------------------
// POST /carrito.php?action=update
// Body: { "id": "...", "cantidad": 2 }
// -------------------------------------------------------
function updateCarrito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $carroId = $input['id'] ?? $_GET['id'] ?? null;
    $cantidad = intval($input['cantidad'] ?? 0);

    if (!$carroId)
        jsonError('id es obligatorio');

    ensureCarritoTable($db, $prefix);

    if ($cantidad <= 0) {
        $stmt = $db->prepare("DELETE FROM {$prefix}app_carro WHERE id = :id AND usuario_id = :uid");
        $stmt->execute(['id' => $carroId, 'uid' => $userId]);
    }
    else {
        $stmt = $db->prepare("UPDATE {$prefix}app_carro SET cantidad = :cant WHERE id = :id AND usuario_id = :uid");
        $stmt->execute(['cant' => $cantidad, 'id' => $carroId, 'uid' => $userId]);
    }

    jsonResponse(['message' => 'Carrito actualizado']);
}

// -------------------------------------------------------
// POST /carrito.php?action=remove
// Body: { "id": "..." }
// -------------------------------------------------------
function removeFromCarrito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $carroId = $input['id'] ?? $_GET['id'] ?? null;

    if (!$carroId)
        jsonError('id es obligatorio');

    ensureCarritoTable($db, $prefix);

    $stmt = $db->prepare("DELETE FROM {$prefix}app_carro WHERE id = :id AND usuario_id = :uid");
    $stmt->execute(['id' => $carroId, 'uid' => $userId]);

    jsonResponse(['message' => 'Eliminado del carrito']);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function ensureCarritoTable(PDO $db, string $prefix): void
{
    $db->exec("
        CREATE TABLE IF NOT EXISTS {$prefix}app_carro (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id BIGINT NOT NULL,
            chollo_id BIGINT NOT NULL,
            cantidad INT DEFAULT 1,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_chollo (usuario_id, chollo_id),
            KEY idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function getImageUrlCart(PDO $db, string $prefix, ?string $thumbnailId): ?string
{
    if (!$thumbnailId)
        return null;
    
    try {
        // Buscar en postmeta primero
        $stmt = $db->prepare("
            SELECT meta_value FROM {$prefix}postmeta 
            WHERE post_id = :id AND meta_key = '_wp_attached_file' 
            LIMIT 1
        ");
        $stmt->execute(['id' => $thumbnailId]);
        $result = $stmt->fetch();
        
        if ($result && $result['meta_value']) {
            return SITE_URL . '/wp-content/uploads/' . $result['meta_value'];
        }
        
        // Si no encuentra, buscar el GUID
        $stmt = $db->prepare("SELECT guid FROM {$prefix}posts WHERE ID = :id LIMIT 1");
        $stmt->execute(['id' => $thumbnailId]);
        $result = $stmt->fetch();
        
        if ($result && $result['guid']) {
            return $result['guid'];
        }
        
        return null;
    } catch (Exception $e) {
        error_log("getImageUrlCart error: " . $e->getMessage());
        return null;
    }
}

function getVendorCart(PDO $db, string $prefix, ?string $authorId): ?array
{
    if (!$authorId)
        return null;
    $stmt = $db->prepare("SELECT ID as id, display_name as nombre FROM {$prefix}users WHERE ID = :id");
    $stmt->execute(['id' => $authorId]);
    return $stmt->fetch() ?: null;
}
