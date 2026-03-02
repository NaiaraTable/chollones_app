<?php
// ======================================================
// API DE CATEGORÍAS (Taxonomía product_cat de WooCommerce)
// ======================================================
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
