<?php
// ======================================================
// API DE CHOLLOS (Productos WooCommerce)
// ======================================================
require_once __DIR__ . '/config.php';

$db = getDB();
$prefix = TABLE_PREFIX;

// Determinar acción
$id = $_GET['id'] ?? null;
$similares = isset($_GET['similares']);
$topVentas = isset($_GET['top_ventas']);

if ($id) {
    getCholloById($db, $prefix, $id);
} elseif ($similares) {
    getChollosSimilares($db, $prefix);
} elseif ($topVentas) {
    getTopVentas($db, $prefix);
} else {
    getChollos($db, $prefix);
}

// -------------------------------------------------------
// GET /chollos.php → Listar todos los chollos
// -------------------------------------------------------
function getChollos(PDO $db, string $prefix): void
{
    $sql = "
        SELECT
            p.ID as id,
            p.post_title as titulo,
            p.post_content as descripcion,
            p.post_date as created_at,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as precio_oferta,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
        FROM {$prefix}posts p
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE p.post_type = 'product'
          AND p.post_status = 'publish'
        GROUP BY p.ID
        ORDER BY p.post_date DESC
    ";

    $products = $db->query($sql)->fetchAll();

    // Enriquecer con imágenes, categorías y vendedor
    foreach ($products as &$product) {
        $product['imagen_url'] = getImageUrl($db, $prefix, $product['thumbnail_id']);
        $product['categorias'] = getProductCategories($db, $prefix, $product['id']);
        $product['proveedores'] = getVendor($db, $prefix, $product['autor_id']);

        // Limpiar campos auxiliares
        unset($product['thumbnail_id'], $product['autor_id']);

        // Asegurar tipos numéricos
        $product['precio_actual'] = $product['precio_actual'] ? floatval($product['precio_actual']) : null;
        $product['precio_original'] = $product['precio_original'] ? floatval($product['precio_original']) : null;

        if ($product['precio_original'] === $product['precio_actual']) {
            $product['precio_original'] = null;
        }
    }

    jsonResponse($products);
}

// -------------------------------------------------------
// GET /chollos.php?top_ventas=1 → Top 5 más vendidos
// -------------------------------------------------------
function getTopVentas(PDO $db, string $prefix): void
{
    $sql = "
        SELECT
            p.ID as id,
            p.post_title as titulo,
            p.post_content as descripcion,
            p.post_date as created_at,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as precio_oferta,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id,
            CAST(MAX(CASE WHEN pm.meta_key = 'total_sales' THEN pm.meta_value END) AS UNSIGNED) as ventas
        FROM {$prefix}posts p
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE p.post_type = 'product'
          AND p.post_status = 'publish'
        GROUP BY p.ID
        ORDER BY ventas DESC
        LIMIT 10
    ";

    $products = $db->query($sql)->fetchAll();

    foreach ($products as &$product) {
        $product['imagen_url'] = getImageUrl($db, $prefix, $product['thumbnail_id']);
        $product['categorias'] = getProductCategories($db, $prefix, $product['id']);
        $product['proveedores'] = getVendor($db, $prefix, $product['autor_id']);

        unset($product['thumbnail_id'], $product['autor_id'], $product['ventas']);

        $product['precio_actual'] = $product['precio_actual'] ? floatval($product['precio_actual']) : null;
        $product['precio_original'] = $product['precio_original'] ? floatval($product['precio_original']) : null;

        if ($product['precio_original'] === $product['precio_actual']) {
            $product['precio_original'] = null;
        }
    }

    jsonResponse($products);
}

// -------------------------------------------------------
// GET /chollos.php?id=X → Detalle de un chollo
// -------------------------------------------------------
function getCholloById(PDO $db, string $prefix, string $id): void
{
    $sql = "
        SELECT
            p.ID as id,
            p.post_title as titulo,
            p.post_content as descripcion,
            p.post_excerpt as extracto,
            p.post_date as created_at,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as precio_oferta,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
        FROM {$prefix}posts p
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE p.ID = :id
          AND p.post_type = 'product'
          AND p.post_status = 'publish'
        GROUP BY p.ID
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute(['id' => $id]);
    $product = $stmt->fetch();

    if (!$product) {
        jsonError('Chollo no encontrado', 404);
    }

    $product['imagen_url'] = getImageUrl($db, $prefix, $product['thumbnail_id']);
    $product['categorias'] = getProductCategories($db, $prefix, $product['id']);
    $product['proveedores'] = getVendor($db, $prefix, $product['autor_id']);

    unset($product['thumbnail_id'], $product['autor_id']);

    $product['precio_actual'] = $product['precio_actual'] ? floatval($product['precio_actual']) : null;
    $product['precio_original'] = $product['precio_original'] ? floatval($product['precio_original']) : null;

    if ($product['precio_original'] === $product['precio_actual']) {
        $product['precio_original'] = null;
    }

    jsonResponse($product);
}

// -------------------------------------------------------
// GET /chollos.php?similares=1&categoria_id=X&exclude=Y
// -------------------------------------------------------
function getChollosSimilares(PDO $db, string $prefix): void
{
    $categoriaId = $_GET['categoria_id'] ?? null;
    $proveedorId = $_GET['proveedor_id'] ?? null;
    $excludeId = $_GET['exclude'] ?? '';
    $limit = intval($_GET['limit'] ?? 10);

    if (!$categoriaId && !$proveedorId) {
        jsonResponse([]);
        return;
    }

    $params = ['exclude' => $excludeId];
    $extraWhere = '';

    if ($categoriaId) {
        $extraWhere = "AND p.ID IN (
            SELECT tr.object_id FROM {$prefix}term_relationships tr
            JOIN {$prefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            WHERE tt.term_id = :filter_id AND tt.taxonomy = 'product_cat'
        )";
        $params['filter_id'] = $categoriaId;
    } elseif ($proveedorId) {
        $extraWhere = "AND p.post_author = :filter_id";
        $params['filter_id'] = $proveedorId;
    }

    $sql = "
        SELECT
            p.ID as id,
            p.post_title as titulo,
            p.post_content as descripcion,
            p.post_date as created_at,
            p.post_author as autor_id,
            MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as precio_actual,
            MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as precio_original,
            MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id
        FROM {$prefix}posts p
        LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
        WHERE p.post_type = 'product'
          AND p.post_status = 'publish'
          AND p.ID != :exclude
          {$extraWhere}
        GROUP BY p.ID
        ORDER BY p.post_date DESC
        LIMIT {$limit}
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    foreach ($products as &$product) {
        $product['imagen_url'] = getImageUrl($db, $prefix, $product['thumbnail_id']);
        $product['categorias'] = getProductCategories($db, $prefix, $product['id']);
        $product['proveedores'] = getVendor($db, $prefix, $product['autor_id']);
        unset($product['thumbnail_id'], $product['autor_id']);
        $product['precio_actual'] = $product['precio_actual'] ? floatval($product['precio_actual']) : null;
        $product['precio_original'] = $product['precio_original'] ? floatval($product['precio_original']) : null;

        if ($product['precio_original'] === $product['precio_actual']) {
            $product['precio_original'] = null;
        }
    }

    jsonResponse($products);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

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

function getProductCategories(PDO $db, string $prefix, string $productId): ?array
{
    $stmt = $db->prepare("
        SELECT t.term_id as id, t.name as nombre, t.slug
        FROM {$prefix}terms t
        JOIN {$prefix}term_taxonomy tt ON t.term_id = tt.term_id
        JOIN {$prefix}term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
        WHERE tr.object_id = :product_id
          AND tt.taxonomy = 'product_cat'
    ");
    $stmt->execute(['product_id' => $productId]);
    $cats = $stmt->fetchAll();
    return $cats ?: null;
}

function getVendor(PDO $db, string $prefix, ?string $authorId): ?array
{
    if (!$authorId)
        return null;

    $stmt = $db->prepare("
        SELECT
            u.ID as id,
            u.display_name as nombre,
            MAX(CASE WHEN um.meta_key = 'dokan_geo_latitude' THEN um.meta_value END) as lat,
            MAX(CASE WHEN um.meta_key = 'dokan_geo_longitude' THEN um.meta_value END) as lng
        FROM {$prefix}users u
        LEFT JOIN {$prefix}usermeta um ON u.ID = um.user_id
        WHERE u.ID = :author_id
        GROUP BY u.ID
    ");
    $stmt->execute(['author_id' => $authorId]);
    $vendor = $stmt->fetch();

    if ($vendor) {
        $vendor['lat'] = $vendor['lat'] ? floatval($vendor['lat']) : null;
        $vendor['lng'] = $vendor['lng'] ? floatval($vendor['lng']) : null;
    }

    return $vendor ?: null;
}
