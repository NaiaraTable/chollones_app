<?php
// ======================================================
// API DE CUPONES (WooCommerce shop_coupon)
// ======================================================
require_once __DIR__ . '/config.php';

$db = getDB();
$prefix = TABLE_PREFIX;

$today = date('Y-m-d');

$sql = "
    SELECT
        p.ID as id,
        p.post_title as codigo,
        p.post_excerpt as descripcion,
        p.post_date as created_at,
        MAX(CASE WHEN pm.meta_key = 'discount_type' THEN pm.meta_value END) as tipo_descuento,
        MAX(CASE WHEN pm.meta_key = 'coupon_amount' THEN pm.meta_value END) as cantidad,
        MAX(CASE WHEN pm.meta_key = 'date_expires' THEN pm.meta_value END) as valido_hasta,
        MAX(CASE WHEN pm.meta_key = 'usage_count' THEN pm.meta_value END) as usos,
        MAX(CASE WHEN pm.meta_key = 'usage_limit' THEN pm.meta_value END) as limite_usos,
        MAX(CASE WHEN pm.meta_key = 'minimum_amount' THEN pm.meta_value END) as importe_minimo
    FROM {$prefix}posts p
    LEFT JOIN {$prefix}postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'shop_coupon'
      AND p.post_status = 'publish'
    GROUP BY p.ID
    HAVING valido_hasta IS NULL OR valido_hasta = '' OR FROM_UNIXTIME(valido_hasta) >= :today
    ORDER BY p.post_date DESC
";

$stmt = $db->prepare($sql);
$stmt->execute(['today' => $today]);
$cupones = $stmt->fetchAll();

// Formatear
foreach ($cupones as &$cupon) {
    $cupon['cantidad'] = $cupon['cantidad'] ? floatval($cupon['cantidad']) : null;
    if ($cupon['valido_hasta'] && is_numeric($cupon['valido_hasta'])) {
        $cupon['valido_hasta'] = date('Y-m-d', intval($cupon['valido_hasta']));
    }
}

jsonResponse($cupones);
