<?php
require_once __DIR__ . '/vendor/autoload.php';
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\ApnsConfig;

function enviarNotificacionPorCategoria($id_categoria, $pdo) {
    //Buscamos el nombre de la categoría
    $stmt_cat = $pdo->prepare("SELECT name FROM fxUZtB_terms WHERE term_id = :cat_id LIMIT 1");
    $stmt_cat->execute(['cat_id' => $id_categoria]);
    $categoria = $stmt_cat->fetch(PDO::FETCH_ASSOC);

    if (!$categoria) return "Categoría no encontrada.";
    $nombre_cat = $categoria['name'];

    // Buscamos usuarios interesados (con token y favoritos)
    $sql_users = "
        SELECT u.fcm_token
        FROM fxUZtB_users u
        JOIN fxUZtB_user_favorite_categories fav ON u.ID = fav.user_id
        WHERE fav.category_id = :cat_id
        AND u.fcm_token IS NOT NULL
        AND u.fcm_token != ''
    ";

    $stmt_users = $pdo->prepare($sql_users);
    $stmt_users->execute(['cat_id' => $id_categoria]);
    $tokens = $stmt_users->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tokens)) return "Sin usuarios para la categoría: $nombre_cat";

    // Configuración Firebase
    $factory = (new Factory)->withServiceAccount(__DIR__.'/firebase-credentials.json');
    $messaging = $factory->createMessaging();

    $titulo = "¡Nuevo chollo en $nombre_cat!";
    $cuerpo = "Hay una nueva oferta que te interesa.";

    // CREACIÓN DEL MENSAJE CON DATOS (Para que salte dentro de la app)
    $message = CloudMessage::new()
        ->withNotification(['title' => $titulo, 'body' => $cuerpo])
        ->withData([
            'tipo' => 'NUEVO_CHOLLO',
            'categoria_nombre' => $nombre_cat,
            'categoria_id' => (string)$id_categoria,
            'mensaje_interno' => "¡Hey! Acabamos de publicar algo en $nombre_cat"
        ])
        ->withApnsConfig(ApnsConfig::fromArray([
            'payload' => ['aps' => ['sound' => 'default', 'badge' => 1]],
        ]));

    try {
        $report = $messaging->sendMulticast($message, $tokens);
        return "Enviado a " . $report->successes()->count() . " usuarios.";
    } catch (Exception $e) {
        return "Error crítico: " . $e->getMessage();
    }
}
