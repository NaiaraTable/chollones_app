<?php
require __DIR__ . '/vendor/autoload.php';
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\ApnsConfig;


$pdo = new PDO('mysql:host=localhost;dbname=u464218955_Phi2T', 'tu_usuario', 'tu_password');


function enviarNotificacionPorCategoria($id_categoria_nueva, $pdo) {
    $sql_cat = "SELECT name FROM fxUZtB_terms WHERE term_id = :cat_id LIMIT 1";
    $stmt_cat = $pdo->prepare($sql_cat);
    $stmt_cat->execute(['cat_id' => $id_categoria_nueva]);
    $categoria = $stmt_cat->fetch(PDO::FETCH_ASSOC);

    if (!$categoria) {
        return "La categoría no existe.";
    }

    $nombre_categoria = $categoria['name'];
    $titulo_chollo = "¡Nuevo chollo en " . $nombre_categoria . "!";
    $cuerpo_chollo = "Se acaba de publicar una oferta increíble en la sección de " . $nombre_categoria . ". ¡Corre que vuela!";


    $sql_users = "
        SELECT u.fcm_token
        FROM fxUZtB_users u
        JOIN fxUZtB_user_favorite_categories fav ON u.ID = fav.user_id
        WHERE fav.category_id = :cat_id
        AND u.fcm_token IS NOT NULL
    ";

    $stmt_users = $pdo->prepare($sql_users);
    $stmt_users->execute(['cat_id' => $id_categoria_nueva]);
    $tokens = $stmt_users->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tokens)) {
        return "No hay usuarios suscritos a " . $nombre_categoria;
    }

    $factory = (new Factory)->withServiceAccount(__DIR__.'/firebase-credentials.json');
    $messaging = $factory->createMessaging();

    $message = CloudMessage::new()
        ->withNotification([
            'title' => $titulo_chollo,
            'body' => $cuerpo_chollo
        ])
        ->withApnsConfig(
            ApnsConfig::fromArray([
                'payload' => [
                    'aps' => [
                        'sound' => 'default',
                        'badge' => 1,
                    ],
                ],
            ])
        );

    try {
        $report = $messaging->sendMulticast($message, $tokens);
        return "Notificación enviada a " . $report->successes()->count() . " usuarios de " . $nombre_categoria;
    } catch (Exception $e) {
        return "Error: " . $e->getMessage();
    }
}

?>
