<?php
// ======================================================
// API DE REVIEWS (wp_comments con comment_type='review')
// Los headers CORS y Content-Type los gestiona config.php
// ======================================================

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error reviews.php: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Error interno: ' . $errstr]);
    exit();
});

require_once __DIR__ . '/config.php';

$db     = getDB();
$prefix = TABLE_PREFIX;
$action = $_GET['action'] ?? 'list';

switch ($action) {
    case 'list':
        handleList($db, $prefix);
        break;
    case 'add':
        handleAdd($db, $prefix);
        break;
    case 'delete':
        handleDelete($db, $prefix);
        break;
    default:
        jsonError('Acción no válida');
}

// -------------------------------------------------------
// GET /reviews.php?action=list&product_id=X
// Público. Si el usuario está logueado, marca "es_mia".
// -------------------------------------------------------
function handleList(PDO $db, string $prefix): void
{
    $productId = $_GET['product_id'] ?? null;
    if (!$productId) jsonError('product_id requerido');

    // getAuthenticatedUser() de config.php: devuelve el payload JWT o null
    // No lanza excepción si no hay token, perfecto para endpoint público
    $authUser      = getAuthenticatedUser();
    $currentUserId = $authUser ? intval($authUser['user_id']) : null;

    $stmt = $db->prepare("
        SELECT
            c.comment_ID         AS id,
            c.comment_author     AS autor,
            c.comment_content    AS comentario,
            c.comment_date       AS fecha,
            c.user_id            AS user_id,
            MAX(CASE WHEN cm.meta_key = 'rating' THEN cm.meta_value END) AS puntuacion
        FROM {$prefix}comments c
        LEFT JOIN {$prefix}commentmeta cm ON c.comment_ID = cm.comment_id
        WHERE c.comment_post_ID = :product_id
          AND c.comment_type    = 'review'
          AND c.comment_approved NOT IN ('spam', 'trash')
        GROUP BY c.comment_ID
        ORDER BY c.comment_date DESC
    ");
    $stmt->execute(['product_id' => $productId]);
    $reviews = $stmt->fetchAll();

    foreach ($reviews as &$r) {
        $r['puntuacion'] = $r['puntuacion'] ? intval($r['puntuacion']) : 0;
        $r['es_mia']     = ($currentUserId !== null && intval($r['user_id']) === $currentUserId);
        // Limpiar etiquetas HTML del contenido
        $r["comentario"] = strip_tags($r["comentario"]);
        unset($r["user_id"]);
    }

    jsonResponse($reviews);
}

// -------------------------------------------------------
// POST /reviews.php?action=add
// Body JSON: { "product_id": X, "puntuacion": 1-5, "comentario": "..." }
// -------------------------------------------------------
function handleAdd(PDO $db, string $prefix): void
{
    // requireAuth() de config.php: llama a jsonError(401) si no hay token válido
    $auth   = requireAuth();
    $userId = intval($auth['user_id']);

    $input      = json_decode(file_get_contents('php://input'), true) ?? [];
    $productId  = $input['product_id'] ?? null;
    $puntuacion = intval($input['puntuacion'] ?? 0);
    $comentario = trim($input['comentario'] ?? '');

    if (!$productId)                        jsonError('product_id requerido');
    if ($puntuacion < 1 || $puntuacion > 5) jsonError('La puntuación debe ser entre 1 y 5');
    if (strlen($comentario) < 3)            jsonError('El comentario es demasiado corto');

    // Verificar que el producto existe y está publicado
    $stmtP = $db->prepare("
        SELECT ID FROM {$prefix}posts
        WHERE ID = :id AND post_type = 'product' AND post_status = 'publish'
    ");
    $stmtP->execute(['id' => $productId]);
    if (!$stmtP->fetch()) jsonError('Producto no encontrado', 404);

    // Solo 1 review por usuario por producto
    $stmtCheck = $db->prepare("
        SELECT comment_ID FROM {$prefix}comments
        WHERE comment_post_ID = :product_id
          AND user_id         = :user_id
          AND comment_type    = 'review'
        LIMIT 1
    ");
    $stmtCheck->execute(['product_id' => $productId, 'user_id' => $userId]);
    if ($stmtCheck->fetch()) jsonError('Ya has escrito una reseña para este producto', 409);

    // Datos del usuario para rellenar los campos del comentario
    $stmtU = $db->prepare("SELECT display_name, user_email FROM {$prefix}users WHERE ID = :id");
    $stmtU->execute(['id' => $userId]);
    $user = $stmtU->fetch();
    if (!$user) jsonError('Usuario no encontrado', 404);

    // Insertar la review aprobada directamente
    $stmtIns = $db->prepare("
        INSERT INTO {$prefix}comments
            (comment_post_ID, comment_author, comment_author_email, comment_content,
             comment_date, comment_date_gmt, comment_approved, comment_type, user_id)
        VALUES
            (:post_id, :author, :email, :content,
             NOW(), UTC_TIMESTAMP(), '1', 'review', :user_id)
    ");
    $stmtIns->execute([
        'post_id'  => $productId,
        'author'   => $user['display_name'],
        'email'    => $user['user_email'],
        'content'  => $comentario,
        'user_id'  => $userId,
    ]);
    $commentId = $db->lastInsertId();

    // Guardar la puntuación en commentmeta (meta_key = 'rating')
    $db->prepare("
        INSERT INTO {$prefix}commentmeta (comment_id, meta_key, meta_value)
        VALUES (:comment_id, 'rating', :rating)
    ")->execute(['comment_id' => $commentId, 'rating' => $puntuacion]);

    // Actualizar el contador de comentarios del post
    $db->prepare("
        UPDATE {$prefix}posts
        SET comment_count = comment_count + 1
        WHERE ID = :id
    ")->execute(['id' => $productId]);

    jsonResponse([
        'id'         => intval($commentId),
        'autor'      => $user['display_name'],
        'comentario' => $comentario,
        'puntuacion' => $puntuacion,
        'fecha'      => date('Y-m-d H:i:s'),
        'es_mia'     => true,
    ], 201);
}

// -------------------------------------------------------
// POST /reviews.php?action=delete
// Body JSON: { "review_id": X }
// -------------------------------------------------------
function handleDelete(PDO $db, string $prefix): void
{
    $auth   = requireAuth();
    $userId = intval($auth['user_id']);

    $input    = json_decode(file_get_contents('php://input'), true) ?? [];
    $reviewId = $input['review_id'] ?? null;
    if (!$reviewId) jsonError('review_id requerido');

    // Verificar que la review existe y pertenece al usuario actual
    $stmt = $db->prepare("
        SELECT comment_ID, comment_post_ID FROM {$prefix}comments
        WHERE comment_ID   = :id
          AND user_id      = :user_id
          AND comment_type = 'review'
    ");
    $stmt->execute(['id' => $reviewId, 'user_id' => $userId]);
    $review = $stmt->fetch();

    if (!$review) jsonError('Reseña no encontrada o sin permiso', 403);

    // Borrar metadatos y comentario
    $db->prepare("DELETE FROM {$prefix}commentmeta WHERE comment_id = :id")
       ->execute(['id' => $reviewId]);
    $db->prepare("DELETE FROM {$prefix}comments WHERE comment_ID = :id")
       ->execute(['id' => $reviewId]);

    // Mantener el contador correcto en el post
    $db->prepare("
        UPDATE {$prefix}posts
        SET comment_count = GREATEST(comment_count - 1, 0)
        WHERE ID = :id
    ")->execute(['id' => $review['comment_post_ID']]);

    jsonResponse(['ok' => true]);
}
