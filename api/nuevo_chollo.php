<?php
require __DIR__ . '/vendor/autoload.php';
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;


$pdo = new PDO('mysql:host=localhost;dbname=u464218955_Phi2T', 'tu_usuario', 'tu_password');


$id_categoria_nueva = 15;
$titulo_chollo = "¡Oferta Flash Detectada!";
$cuerpo_chollo = "Un producto de tu categoría favorita acaba de bajar de precio.";

$sql = "
    SELECT u.fcm_token
    FROM fxUZtB_users u
    JOIN fxUZtB_user_favorite_categories fav ON u.ID = fav.user_id
    WHERE fav.category_id = :cat_id
    AND u.fcm_token IS NOT NULL
";

$stmt = $pdo->prepare($sql);
$stmt->execute(['cat_id' => $id_categoria_nueva]);
$tokens = $stmt->fetchAll(PDO::FETCH_COLUMN);

if (empty($tokens)) {
    exit("No hay usuarios interesados en esta categoría.");
}


$factory = (new Factory)->withServiceAccount(__DIR__.'/firebase-credentials.json');
$messaging = $factory->createMessaging();
$message = CloudMessage::new()
    ->withNotification(['title' => $titulo_chollo, 'body' => $cuerpo_chollo]);

try {
    $report = $messaging->sendMulticast($message, $tokens);
    echo "Enviado a " . $report->successes()->count() . " dispositivos.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
