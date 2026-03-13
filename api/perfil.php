<?php
// ======================================================
// API DE PERFIL DE USUARIO
// ======================================================

// --- CORS HEADERS (PRIMERO - antes de cualquier otra cosa) ---
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization', true);
header('Access-Control-Max-Age: 3600', true);
header('Content-Type: application/json; charset=utf-8', true);

// Responder inmediatamente a las peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Capturar errores
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("Error: $errstr en $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor']);
    exit();
});

require_once __DIR__ . '/config.php';

$db = getDB();
$prefix = TABLE_PREFIX;
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'update':
        updateProfile($db, $prefix);
        break;
    case 'password':
        updatePassword($db, $prefix);
        break;
    case 'avatar':
        uploadAvatar($db, $prefix);
        break;
    default:
        jsonError('Acción no válida');
}

// -------------------------------------------------------
// POST /perfil.php?action=update
// Body: { "full_name": "...", ... }
// -------------------------------------------------------
function updateProfile(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $fullName = $input['full_name'] ?? null;

    if ($fullName) {
        $db->prepare("UPDATE {$prefix}users SET display_name = :name WHERE ID = :id")
            ->execute(['name' => $fullName, 'id' => $userId]);

        upsertMeta($db, $prefix, $userId, 'first_name', $fullName);
    }

    // Actualizar cualquier otra metadata recibida
    foreach ($input as $key => $value) {
        if ($key !== 'full_name') {
            upsertMeta($db, $prefix, $userId, $key, $value);
        }
    }

    // Devolver datos actualizados
    $stmt = $db->prepare("
        SELECT u.ID as id, u.user_email as email, u.display_name,
               MAX(CASE WHEN um.meta_key = 'avatar_url' THEN um.meta_value END) as avatar_url,
               MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END) as first_name
        FROM {$prefix}users u
        LEFT JOIN {$prefix}usermeta um ON u.ID = um.user_id
        WHERE u.ID = :id
        GROUP BY u.ID
    ");
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    $user['user_metadata'] = [
        'full_name' => $user['display_name'],
        'avatar_url' => $user['avatar_url'],
    ];

    jsonResponse($user);
}

// -------------------------------------------------------
// POST /perfil.php?action=password
// Body: { "password": "nueva_contraseña" }
// -------------------------------------------------------
function updatePassword(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    $newPassword = $input['password'] ?? '';

    if (strlen($newPassword) < 6) {
        jsonError('La contraseña debe tener al menos 6 caracteres');
    }

    $hash = wp_hash_password($newPassword);
    $db->prepare("UPDATE {$prefix}users SET user_pass = :pass WHERE ID = :id")
        ->execute(['pass' => $hash, 'id' => $userId]);

    jsonResponse(['message' => 'Contraseña actualizada']);
}

// -------------------------------------------------------
// POST /perfil.php?action=avatar (multipart file upload)
// -------------------------------------------------------
function uploadAvatar(PDO $db, string $prefix): void
{
    $auth = requireAuth();
    $userId = $auth['user_id'];

    if (!isset($_FILES['avatar'])) {
        jsonError('No se recibió archivo');
    }

    $file = $_FILES['avatar'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array(strtolower($ext), $allowed)) {
        jsonError('Formato de imagen no permitido');
    }

    // Crear directorio de avatares
    $uploadDir = __DIR__ . '/uploads/avatars/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = "user_{$userId}_avatar.{$ext}";
    $filePath = $uploadDir . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        jsonError('Error al guardar el archivo', 500);
    }

    // Guardar URL del avatar en usermeta
    $avatarUrl = 'http://localhost/chollones-api/uploads/avatars/' . $fileName . '?t=' . time();
    upsertMeta($db, $prefix, $userId, 'avatar_url', $avatarUrl);

    jsonResponse(['avatar_url' => $avatarUrl]);
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------
function upsertMeta(PDO $db, string $prefix, string $userId, string $key, string $value): void
{
    $stmt = $db->prepare("
        SELECT umeta_id FROM {$prefix}usermeta WHERE user_id = :uid AND meta_key = :key
    ");
    $stmt->execute(['uid' => $userId, 'key' => $key]);

    if ($stmt->fetch()) {
        $db->prepare("UPDATE {$prefix}usermeta SET meta_value = :val WHERE user_id = :uid AND meta_key = :key")
            ->execute(['val' => $value, 'uid' => $userId, 'key' => $key]);
    } else {
        $db->prepare("INSERT INTO {$prefix}usermeta (user_id, meta_key, meta_value) VALUES (:uid, :key, :val)")
            ->execute(['uid' => $userId, 'key' => $key, 'val' => $value]);
    }
}
