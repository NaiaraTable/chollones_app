<?php
// ======================================================
// API DE CATEGORÍAS (Taxonomía product_cat de WooCommerce)
// ======================================================

// --- CORS HEADERS (PRIMERO - antes de cualquier otra cosa) ---
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization', true);
header('Access-Control-Max-Age: 3600', true);
header('Content-Type: application/json; charset=utf-8', true);

// Responder inmediatamente a las peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Capturar errores
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor']);
    exit();
});

require_once __DIR__ . '/config.php';

$db = getDB();
$prefix = TABLE_PREFIX;

$sql = "
    SELECT
        t.term_id as id,
        t.name as nombre,
        t.slug,
        tt.description as descripcion,
        tt.count as total_productos
    FROM {$prefix}terms t
    JOIN {$prefix}term_taxonomy tt ON t.term_id = tt.term_id
    WHERE tt.taxonomy = 'product_cat'
      AND tt.count > 0
    ORDER BY t.name ASC
";

$categorias = $db->query($sql)->fetchAll();

jsonResponse($categorias);
