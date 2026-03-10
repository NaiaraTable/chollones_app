<?php
// 1. Incluimos la configuración global (esto carga CORS, funciones y DB)
require_once __DIR__ . '/config.php';

// 2. Obtenemos la conexión a la base de datos usando tu helper
$pdo = getDB();

// ------------------------------------------------------------------
// IMPORTANTE: Cuando vayas a usar el login real con JWT, descomenta esto:
// $usuario_actual = requireAuth();
// $user_id = $usuario_actual['id']; // o el nombre de campo que uses en el payload
// ------------------------------------------------------------------


try {
    $metodo = $_SERVER['REQUEST_METHOD'];

    // GET: Obtener las categorías favoritas del usuario
    if ($metodo === 'GET') {
        $stmt = $pdo->prepare("SELECT category_id FROM fxUZtB_user_favorite_categories WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $favoritos = $stmt->fetchAll(PDO::FETCH_COLUMN); // Devuelve un array de IDs, ej: [12, 45, 8]

        echo json_encode(['data' => $favoritos]);
        exit;
    }

    // POST: Guardar/Actualizar las categorías favoritas
    elseif ($metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $categorias_ids = $input['categorias_ids'] ?? [];

        // Validar que no se pasen de 3
        if (count($categorias_ids) > 3) {
            http_response_code(400);
            echo json_encode(['error' => 'Máximo 3 categorías permitidas']);
            exit;
        }

        $pdo->beginTransaction();

        // 1. Borrar las preferencias anteriores de este usuario
        $stmtDelete = $pdo->prepare("DELETE FROM fxUZtB_user_favorite_categories WHERE user_id = ?");
        $stmtDelete->execute([$user_id]);

        // 2. Insertar las nuevas si existen
        if (!empty($categorias_ids)) {
            $stmtInsert = $pdo->prepare("INSERT INTO fxUZtB_user_favorite_categories (user_id, category_id) VALUES (?, ?)");
            foreach ($categorias_ids as $cat_id) {
                $stmtInsert->execute([$user_id, $cat_id]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Categorías guardadas correctamente']);
        exit;
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos: ' . $e->getMessage()]);
}
