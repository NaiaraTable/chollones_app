<?php
// ENDPOINT DE DEBUG - SIN AUTENTICACIÓN REQUERIDA
// Vísita: http://localhost:8100/api/debug-historial.php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    
    $output = [
        'status' => 'debug',
        'timestamp' => date('Y-m-d H:i:s'),
        'tests' => []
    ];
    
    // Test 1: Conexión a BD
    $output['tests']['database_connection'] = [
        'status' => 'ok',
        'message' => 'Conectado a la base de datos'
    ];
    
    // Test 2: Tabla app_historial existe
    try {
        $stmt = $db->query("SELECT COUNT(*) as total FROM {$prefix}app_historial");
        $result = $stmt->fetch();
        $output['tests']['app_historial_count'] = [
            'status' => 'ok',
            'total_purchases' => (int)$result['total']
        ];
    } catch (Exception $e) {
        $output['tests']['app_historial_count'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 3: Tabla app_historial_items existe
    try {
        $stmt = $db->query("SELECT COUNT(*) as total FROM {$prefix}app_historial_items");
        $result = $stmt->fetch();
        $output['tests']['app_historial_items_count'] = [
            'status' => 'ok',
            'total_items' => (int)$result['total']
        ];
    } catch (Exception $e) {
        $output['tests']['app_historial_items_count'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 4: Verificar que hay datos en las tablas
    try {
        $sql = "SELECT 
                    h.id,
                    h.usuario_id,
                    h.numero_pedido,
                    h.estado,
                    COUNT(hi.id) as items_count
                FROM {$prefix}app_historial h
                LEFT JOIN {$prefix}app_historial_items hi ON h.id = hi.historial_id
                GROUP BY h.id
                LIMIT 1";
        $stmt = $db->query($sql);
        $firstCompra = $stmt->fetch();
        
        if ($firstCompra) {
            $output['tests']['first_purchase_sample'] = [
                'status' => 'ok',
                'data' => [
                    'id' => $firstCompra['id'],
                    'usuario_id' => $firstCompra['usuario_id'],
                    'numero_pedido' => $firstCompra['numero_pedido'],
                    'estado' => $firstCompra['estado'],
                    'items_count' => (int)$firstCompra['items_count']
                ]
            ];
        } else {
            $output['tests']['first_purchase_sample'] = [
                'status' => 'warning',
                'message' => 'No hay compras en la base de datos'
            ];
        }
    } catch (Exception $e) {
        $output['tests']['first_purchase_sample'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 5: Verificar estructura de items preview
    try {
        $sql = "SELECT 
                    id,
                    titulo,
                    imagen_url,
                    chollo_id,
                    cantidad
                FROM {$prefix}app_historial_items
                LIMIT 4";
        $stmt = $db->query($sql);
        $items = $stmt->fetchAll();
        
        $output['tests']['sample_items'] = [
            'status' => 'ok',
            'count' => count($items),
            'items' => array_map(function($item) {
                return [
                    'titulo' => $item['titulo'],
                    'imagen_url' => $item['imagen_url'] ? '✓ SET' : '✗ NULL',
                    'chollo_id' => $item['chollo_id'],
                    'cantidad' => $item['cantidad']
                ];
            }, $items)
        ];
    } catch (Exception $e) {
        $output['tests']['sample_items'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 6: Verificar getImageUrl function
    $output['tests']['getImageUrl_function'] = [
        'status' => function_exists('getImageUrl') ? 'ok' : 'error',
        'message' => function_exists('getImageUrl') ? 'Función disponible' : 'Función NO encontrada'
    ];
    
    echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
?>
