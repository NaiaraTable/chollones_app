<?php

require_once __DIR__ . '/config.php';
$pdo = getDB();
$usuario_actual = requireAuth();
 $user_id = $usuario_actual['user_id'];



try {
    $metodo = $_SERVER['REQUEST_METHOD'];
    // obtenemos las categorías favoritas del usuario
    if ($metodo === 'GET') {
        $stmt = $pdo->prepare("SELECT category_id FROM fxUZtB_user_favorite_categories WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $favoritos = $stmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode(['data' => $favoritos]);
        exit;
    }

    // guardamos o moficamos las categorías favoritas del usuario
    elseif ($metodo === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $categorias_ids = $input['categorias_ids'] ?? [];

        // ponemos numero maximo de categorías permitidas
        if (count($categorias_ids) > 5) {
            http_response_code(400);
            echo json_encode(['error' => 'Máximo 5 categorías permitidas']);
            exit;
        }

        $pdo->beginTransaction();

        // borramos las categorias elegidas anteriormente para el usuario
        $stmtDelete = $pdo->prepare("DELETE FROM fxUZtB_user_favorite_categories WHERE user_id = ?");
        $stmtDelete->execute([$user_id]);

        // insertamos las categorias nuevas
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
