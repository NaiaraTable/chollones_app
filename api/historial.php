<?php
// ======================================================
// API DEL HISTORIAL DE COMPRAS
// ======================================================


// Capturar errores y warnings
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $errstr]);
    exit();
});

require_once __DIR__ . '/config.php';

try {
    $db = getDB();
    $prefix = TABLE_PREFIX;
    $action = $_GET['action'] ?? 'list';

    switch ($action) {
        case 'list':
            obtenerHistorialCompras($db, $prefix);
            break;
        case 'create':
            crearCompra($db, $prefix);
            break;
        case 'details':
            obtenerDetallesCompra($db, $prefix);
            break;
        default:
            jsonError('Acción no válida');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en el servidor: ' . $e->getMessage()
    ]);
    exit();
}

// -------------------------------------------------------
// GET /historial.php → Obtener historial de compras del usuario
// -------------------------------------------------------
function obtenerHistorialCompras(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    // Asegurar que exists la tabla
    ensureHistorialTable($db, $prefix);

    $sql = "
        SELECT
            h.id,
            h.numero_pedido,
            h.fecha_compra,
            h.total,
            h.estado,
            h.cantidad_items,
            COUNT(hi.id) as articulos_count
        FROM {$prefix}app_historial h
        LEFT JOIN {$prefix}app_historial_items hi ON h.id = hi.historial_id
        WHERE h.usuario_id = :user_id
        GROUP BY h.id
        ORDER BY h.fecha_compra DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute(['user_id' => $userId]);
    $compras = $stmt->fetchAll();

    error_log('DEBUG: Total compras encontradas: ' . count($compras));

    $result = [];
    foreach ($compras as $compra) {
        // Obtener un preview de los primeros 4 artículos
        $sqlItems = "
            SELECT
                hi.id,
                hi.titulo,
                hi.precio_unitario,
                hi.cantidad,
                hi.imagen_url,
                hi.chollo_id
            FROM {$prefix}app_historial_items hi
            WHERE hi.historial_id = :historial_id
            ORDER BY hi.id ASC
            LIMIT 4
        ";
        
        $stmtItems = $db->prepare($sqlItems);
        $stmtItems->execute(['historial_id' => $compra['id']]);
        $articulos_preview = $stmtItems->fetchAll();
        
        error_log('DEBUG: Compra ID ' . $compra['id'] . ' tiene ' . count($articulos_preview) . ' items');
        
        $articulos_preview_array = [];
        foreach ($articulos_preview as $articulo) {
            $imagenUrl = $articulo['imagen_url'];
            
            // Si no hay imagen, intentar obtenerla del producto
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
                
                if ($prod && $prod['thumbnail_id']) {
                    $imagenUrl = getImageUrl($db, $prefix, $prod['thumbnail_id']);
                }
                
                if (!$imagenUrl && $prod && $prod['guid']) {
                    $imagenUrl = $prod['guid'];
                }
                
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
            
            error_log('DEBUG HISTORIAL: Artículo: ' . $articulo['titulo'] . ' | ImgURL: ' . ($imagenUrl ?: 'NULL') . ' | Chollo_ID: ' . ($articulo['chollo_id'] ?: 'NULL'));
            
            $articulos_preview_array[] = [
                'titulo' => $articulo['titulo'],
                'imagen_url' => $imagenUrl,
                'cantidad' => intval($articulo['cantidad'])
            ];
        }
        
        $item = [
            'id' => intval($compra['id']),
            'numero_pedido' => $compra['numero_pedido'],
            'fecha_compra' => $compra['fecha_compra'],
            'total' => floatval($compra['total']),
            'estado' => $compra['estado'],
            'cantidad_items' => intval($compra['cantidad_items']),
            'articulos_count' => intval($compra['articulos_count']),
            'articulos_preview' => $articulos_preview_array
        ];
        
        error_log('DEBUG: Agregando item con articulos_preview: ' . json_encode($articulos_preview_array));
        
        $result[] = $item;
    }

    error_log('DEBUG: RESULTADO FINAL - ' . json_encode($result));
    jsonResponse($result);
}

// -------------------------------------------------------
// POST /historial.php?action=create
// Body: {
//   "articulos": [
//     { "chollo_id": "...", "titulo": "...", "precio": 10.5, "cantidad": 2, "imagen_url": "..." },
//     ...
//   ],
//   "total": 50.00
// }
// -------------------------------------------------------
function crearCompra(PDO $db, string $prefix): void
{
    try {
        $auth = requireAuth();
        $userId = $auth['user_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $articulos = $input['articulos'] ?? [];
        $total = floatval($input['total'] ?? 0);
        $numeroPedidoWc = $input['numero_pedido_wc'] ?? null; // Referencia a la orden de WooCommerce

        if (empty($articulos)) {
            jsonError('Se requieren artículos para crear la compra');
        }

        // Validar y corregir el total si es 0
        if ($total <= 0) {
            // Recalcular el total desde los artículos
            $total = 0;
            foreach ($articulos as $articulo) {
                $precioUnitario = floatval($articulo['precio'] ?? $articulo['precio_unitario'] ?? 0);
                $cantidad = intval($articulo['cantidad'] ?? 1);
                $total += $precioUnitario * $cantidad;
            }
        }

        if ($total <= 0) {
            jsonError('El total debe ser mayor a 0');
        }

        ensureHistorialTable($db, $prefix);

        $db->beginTransaction();

        // Generar número de pedido único local (para referencia en la app)
        $numeroPedido = $numeroPedidoWc ?? ('PED-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 8));

        // Crear compra
        $stmt = $db->prepare("
            INSERT INTO {$prefix}app_historial (usuario_id, numero_pedido, total, cantidad_items, estado, fecha_compra)
            VALUES (:usuario_id, :numero_pedido, :total, :cantidad_items, 'pendiente', NOW())
        ");

        $cantidadItems = array_reduce($articulos, function($carry, $item) {
            return $carry + intval($item['cantidad'] ?? 1);
        }, 0);

        $stmt->execute([
            'usuario_id' => $userId,
            'numero_pedido' => $numeroPedido,
            'total' => $total,
            'cantidad_items' => $cantidadItems
        ]);

        $historialId = intval($db->lastInsertId());

        // Insertar detalles de cada artículo
        $stmtItems = $db->prepare("
            INSERT INTO {$prefix}app_historial_items (
                historial_id,
                chollo_id,
                titulo,
                precio_unitario,
                cantidad,
                subtotal,
                imagen_url
            ) VALUES (
                :historial_id,
                :chollo_id,
                :titulo,
                :precio_unitario,
                :cantidad,
                :subtotal,
                :imagen_url
            )
        ");

        foreach ($articulos as $articulo) {
            $cantidad = intval($articulo['cantidad'] ?? 1);
            // Intentar obtener el precio de varios campos posibles
            $precioUnitario = floatval(
                $articulo['precio_unitario'] ?? 
                $articulo['precio'] ?? 
                0
            );
            $subtotal = $precioUnitario * $cantidad;

            // Obtener imagen URL de varias formas
            $imagenUrl = null;
            
            // Opción 1: Si viene en el artículo
            if (isset($articulo['imagen_url']) && !empty($articulo['imagen_url'])) {
                $imagenUrl = $articulo['imagen_url'];
            }
            
            // Opción 2: Obtener del producto original
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
                
                // Opción 3: Usar GUID del producto
                if (!$imagenUrl && $prod && $prod['guid']) {
                    $imagenUrl = $prod['guid'];
                }
                
                // Opción 4: Buscar attachment directo
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

            $stmtItems->execute([
                'historial_id' => $historialId,
                'chollo_id' => $articulo['chollo_id'] ?? null,
                'titulo' => $articulo['titulo'] ?? 'Producto sin título',
                'precio_unitario' => $precioUnitario,
                'cantidad' => $cantidad,
                'subtotal' => $subtotal,
                'imagen_url' => $imagenUrl
            ]);
        }

        $db->commit();

        // Devolver los datos de la compra creada
        jsonResponse([
            'id' => $historialId,
            'numero_pedido' => $numeroPedido,
            'fecha_compra' => date('Y-m-d H:i:s'),
            'total' => $total,
            'estado' => 'pendiente',
            'cantidad_items' => $cantidadItems
        ], 201);

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en crearCompra: ' . $e->getMessage());
        jsonError('Error al crear la compra: ' . $e->getMessage());
    }
}

// -------------------------------------------------------
// GET /historial.php?action=details&id=X
// Obtener detalles de una compra específica
// -------------------------------------------------------
function obtenerDetallesCompra(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];
    $compraId = $_GET['id'] ?? null;

    if (!$compraId) {
        jsonError('ID de compra es obligatorio');
    }

    ensureHistorialTable($db, $prefix);

    // Obtener datos de la compra
    $sql = "
        SELECT
            h.id,
            h.numero_pedido,
            h.fecha_compra,
            h.total,
            h.estado,
            h.cantidad_items
        FROM {$prefix}app_historial h
        WHERE h.id = :id AND h.usuario_id = :user_id
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute(['id' => $compraId, 'user_id' => $userId]);
    $compra = $stmt->fetch();

    if (!$compra) {
        jsonError('Compra no encontrada', 404);
    }

    // Obtener artículos de la compra
    $sqlItems = "
        SELECT
            hi.id,
            hi.chollo_id,
            hi.titulo,
            hi.precio_unitario,
            hi.cantidad,
            hi.subtotal,
            hi.imagen_url
        FROM {$prefix}app_historial_items hi
        WHERE hi.historial_id = :historial_id
        ORDER BY hi.id ASC
    ";

    $stmtItems = $db->prepare($sqlItems);
    $stmtItems->execute(['historial_id' => $compraId]);
    $articulos = $stmtItems->fetchAll();

    $result = [
        'id' => intval($compra['id']),
        'numero_pedido' => $compra['numero_pedido'],
        'fecha_compra' => $compra['fecha_compra'],
        'total' => floatval($compra['total']),
        'estado' => $compra['estado'],
        'cantidad_items' => intval($compra['cantidad_items']),
        'articulos' => []
    ];

    foreach ($articulos as $articulo) {
        $result['articulos'][] = [
            'id' => intval($articulo['id']),
            'chollo_id' => $articulo['chollo_id'],
            'titulo' => $articulo['titulo'],
            'precio_unitario' => floatval($articulo['precio_unitario']),
            'cantidad' => intval($articulo['cantidad']),
            'subtotal' => floatval($articulo['subtotal']),
            'imagen_url' => $articulo['imagen_url']
        ];
    }

    jsonResponse($result);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function ensureHistorialTable(PDO $db, string $prefix): void
{
    try {
        // Tabla principal de historial
        $db->exec("
            CREATE TABLE IF NOT EXISTS {$prefix}app_historial (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                usuario_id BIGINT NOT NULL,
                numero_pedido VARCHAR(50) UNIQUE NOT NULL,
                fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
                total DECIMAL(10, 2) NOT NULL,
                cantidad_items INT DEFAULT 0,
                estado VARCHAR(20) DEFAULT 'pendiente',
                notas LONGTEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_usuario (usuario_id),
                KEY idx_numero_pedido (numero_pedido),
                KEY idx_fecha (fecha_compra)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        // Tabla de detalles/items de historial
        $db->exec("
            CREATE TABLE IF NOT EXISTS {$prefix}app_historial_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                historial_id BIGINT NOT NULL,
                chollo_id BIGINT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                precio_unitario DECIMAL(10, 2) NOT NULL,
                cantidad INT DEFAULT 1,
                subtotal DECIMAL(10, 2) NOT NULL,
                imagen_url LONGTEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                KEY idx_historial (historial_id),
                KEY idx_chollo (chollo_id),
                FOREIGN KEY (historial_id) REFERENCES {$prefix}app_historial(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    } catch (PDOException $e) {
        // Las tablas probablemente ya existen, ignorar errores de creación
        error_log("ensureHistorialTable error: " . $e->getMessage());
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
