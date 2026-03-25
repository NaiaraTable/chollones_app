<?php
// Test del API de Historial
// Visita: http://localhost:8100/test-historial-api.php

require_once __DIR__ . '/api/config.php';

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    
    // Test 1: Verificar que la tabla existe
    echo "<h2>Test 1: Verificar tabla app_historial</h2>";
    $sql = "SELECT COUNT(*) as total FROM {$prefix}app_historial";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetch();
    echo "Total de compras: " . $result['total'] . "<br>";
    
    // Test 2: Verificar datos de historial_items
    echo "<h2>Test 2: Verificar tabla app_historial_items</h2>";
    $sql = "SELECT COUNT(*) as total, 
                   COUNT(DISTINCT historial_id) as different_purchases,
                   COUNT(DISTINCT CASE WHEN imagen_url IS NOT NULL THEN historial_id END) as purchases_with_images
            FROM {$prefix}app_historial_items";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $result = $stmt->fetch();
    echo "Total items: " . $result['total'] . "<br>";
    echo "Compras diferentes: " . $result['different_purchases'] . "<br>";
    echo "Compras con imagen en item: " . $result['purchases_with_images'] . "<br>";
    
    // Test 3: Mostrar los primeros 2 items de la primera compra
    echo "<h2>Test 3: Primeros items de la primera compra</h2>";
    $sql = "SELECT hi.titulo, hi.imagen_url, hi.chollo_id FROM {$prefix}app_historial_items hi 
            ORDER BY hi.historial_id LIMIT 3";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    while ($item = $stmt->fetch()) {
        echo "Título: " . htmlspecialchars($item['titulo']) . "<br>";
        echo "Imagen URL: " . ($item['imagen_url'] ?: 'NULL') . "<br>";
        echo "Chollo ID: " . $item['chollo_id'] . "<br>";
        echo "---<br>";
    }
    
    // Test 4: Intentar llamar obtenerHistorialCompras como si viniéramos del API
    echo "<h2>Test 4: Simular llamada API</h2>";
    echo "<pre>";
    // Aquí pasaríamos un user_id válido, pero para test usamos el primero encontrado
    $sql = "SELECT usuario_id FROM {$prefix}app_historial LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $historial = $stmt->fetch();
    
    if ($historial) {
        echo "Encontrado usuario: " . $historial['usuario_id'] . "\n";
    } else {
        echo "No hay historial en la BD\n";
    }
    echo "</pre>";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
