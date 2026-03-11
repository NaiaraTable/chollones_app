<?php
// ======================================================
// API DE FAVORITOS (WCBoost Wishlists)
// ======================================================


require_once __DIR__ . '/config.php';

// Disable PHP error display, use JSON instead
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function ($errno, $errstr) {
    jsonError('Error: ' . $errstr, 500);
});

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    $action = $_GET['action'] ?? 'list';

    switch ($action) {
        case 'list':
            getFavoritos($db, $prefix);
            break;
        case 'ids':
            getFavoritosIds($db, $prefix);
            break;
        case 'add':
            addFavorito($db, $prefix);
            break;
        case 'delete':
        case 'remove':
            removeFavorito($db, $prefix);
            break;
        default:
            jsonError('Accion no valida', 400);
    }
}
catch (Exception $e) {
    jsonError('Error: ' . $e->getMessage(), 500);
}

// -------------------------------------------------------
// GET /favoritos.php - Chollos guardados del usuario
// -------------------------------------------------------
function getFavoritos(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $wishlistId = getOrCreateWishlist($db, $prefix, $userId);

    $sql = "
        SELECT
            wi.item_id as id,
            p.ID as chollo_id,
            p.post_title as titulo,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
        FROM {$prefix}wcboost_wishlist_items wi
        JOIN {$prefix}posts p ON wi.product_id = p.ID
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE wi.wishlist_id = :wishlist_id
        GROUP BY wi.item_id
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute(['wishlist_id' => $wishlistId]);
    $items = $stmt->fetchAll();

    $result = [];
    foreach ($items as $item) {
        $result[] = [
            'id' => $item['id'],
            'chollos' => [
                'id' => $item['chollo_id'],
                'titulo' => $item['titulo'],
                'precio_actual' => $item['precio_actual'] ? floatval($item['precio_actual']) : null,
                'precio_original' => ($item['precio_original'] && floatval($item['precio_original']) !== floatval($item['precio_actual'])) ? floatval($item['precio_original']) : null,
                'imagen_url' => getImageUrlFav($db, $prefix, $item['thumbnail_id']),
                'proveedores' => getVendorFav($db, $prefix, $item['autor_id']),
            ]
        ];
    }

    jsonResponse($result);
}

// -------------------------------------------------------
// GET /favoritos.php?action=ids - Solo IDs de favoritos
// -------------------------------------------------------
function getFavoritosIds(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $wishlistId = getOrCreateWishlist($db, $prefix, $userId);

    $stmt = $db->prepare("
        SELECT product_id as chollo_id
        FROM {$prefix}wcboost_wishlist_items
        WHERE wishlist_id = :wishlist_id
    ");
    $stmt->execute(['wishlist_id' => $wishlistId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    jsonResponse(['ids' => $ids]);
}

// -------------------------------------------------------
// POST /favoritos.php?action=add
// Body: { "chollo_id": X }
// -------------------------------------------------------
function addFavorito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $cholloId = $input['chollo_id'] ?? $_GET['chollo_id'] ?? null;

    if (!$cholloId)
        jsonError('chollo_id es obligatorio', 400);

    $wishlistId = getOrCreateWishlist($db, $prefix, $userId);

    $stmt = $db->prepare("
        SELECT item_id FROM {$prefix}wcboost_wishlist_items
        WHERE wishlist_id = :wid AND product_id = :pid
    ");
    $stmt->execute(['wid' => $wishlistId, 'pid' => $cholloId]);
    if ($stmt->fetch()) {
        jsonResponse(['message' => 'Ya esta en favoritos']);
        return;
    }

    $stmt = $db->prepare("
        INSERT INTO {$prefix}wcboost_wishlist_items (wishlist_id, product_id, quantity, date_added)
        VALUES (:wid, :pid, 1, NOW())
    ");
    $stmt->execute(['wid' => $wishlistId, 'pid' => $cholloId]);

    jsonResponse(['message' => 'Anadido a favoritos'], 201);
}

// -------------------------------------------------------
// POST /favoritos.php?action=delete or remove
// Body: { "chollo_id": X }
// -------------------------------------------------------
function removeFavorito(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $cholloId = $input['chollo_id'] ?? $_GET['chollo_id'] ?? null;

    if (!$cholloId)
        jsonError('chollo_id es obligatorio', 400);

    $wishlistId = getOrCreateWishlist($db, $prefix, $userId);

    $stmt = $db->prepare("
        DELETE FROM {$prefix}wcboost_wishlist_items
        WHERE wishlist_id = :wid AND product_id = :pid
    ");
    $stmt->execute(['wid' => $wishlistId, 'pid' => $cholloId]);

    jsonResponse(['message' => 'Eliminado de favoritos']);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------
function getOrCreateWishlist(PDO $db, string $prefix, string $userId): string
{
    $stmt = $db->prepare("
        SELECT wishlist_id FROM {$prefix}wcboost_wishlists WHERE user_id = :uid LIMIT 1
    ");
    $stmt->execute(['uid' => $userId]);
    $wishlist = $stmt->fetch();

    if ($wishlist)
        return $wishlist['wishlist_id'];

    $token = md5($userId . time() . uniqid());
    $stmt = $db->prepare("
        INSERT INTO {$prefix}wcboost_wishlists (user_id, wishlist_title, status, date_created, wishlist_token)
        VALUES (:uid, 'Favoritos', 'private', NOW(), :token)
    ");
    $stmt->execute(['uid' => $userId, 'token' => $token]);
    return $db->lastInsertId();
}

function getImageUrlFav(PDO $db, string $prefix, ?string $thumbnailId): ?string
{
    if (!$thumbnailId)
        return null;
    $stmt = $db->prepare("SELECT meta_value FROM {$prefix}postmeta WHERE post_id = :id AND meta_key = '_wp_attached_file'");
    $stmt->execute(['id' => $thumbnailId]);
    $file = $stmt->fetchColumn();
    return $file ? SITE_URL . '/wp-content/uploads/' . $file : null;
}

function getVendorFav(PDO $db, string $prefix, ?string $authorId): ?array
{
    if (!$authorId)
        return null;
    $stmt = $db->prepare("SELECT ID as id, display_name as nombre FROM {$prefix}users WHERE ID = :id");
    $stmt->execute(['id' => $authorId]);
    return $stmt->fetch() ?: null;
}
?>
