<?php
// ======================================================
// API DE AUTENTICACIÓN (WordPress users)
// ======================================================


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
    case 'login':
        handleLogin($db, $prefix);
        break;
    case 'register':
        handleRegister($db, $prefix);
        break;
    case 'me':
        handleMe($db, $prefix);
        break;
    default:
        jsonError('Acción no válida');
}

// -------------------------------------------------------
// POST /auth.php?action=login
// Body: { "email": "...", "password": "..." }
// -------------------------------------------------------
function handleLogin(PDO $db, string $prefix): void
{
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        jsonError('Email y contraseña son obligatorios');
    }

    // Buscar usuario por email
    $stmt = $db->prepare("
        SELECT u.ID, u.user_login, u.user_email, u.user_pass, u.display_name,
               MAX(CASE WHEN um.meta_key = 'avatar_url' THEN um.meta_value END) as avatar_url,
               MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END) as first_name,
               MAX(CASE WHEN um.meta_key = 'last_name' THEN um.meta_value END) as last_name
        FROM {$prefix}users u
        LEFT JOIN {$prefix}usermeta um ON u.ID = um.user_id
        WHERE u.user_email = :email
        GROUP BY u.ID
    ");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !wp_check_password($password, $user['user_pass'])) {
        jsonError('Credenciales incorrectas', 401);
    }

    // Generar token JWT
    $token = createJWT([
        'user_id' => $user['ID'],
        'email' => $user['user_email'],
        'name' => $user['display_name'],
    ]);

    jsonResponse([
        'token' => $token,
        'user' => [
            'id' => $user['ID'],
            'email' => $user['user_email'],
            'display_name' => $user['display_name'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'avatar_url' => $user['avatar_url'],
            'user_metadata' => [
                'full_name' => $user['display_name'],
                'avatar_url' => $user['avatar_url'],
            ]
        ]
    ]);
}

// -------------------------------------------------------
// POST /auth.php?action=register
// Body: { "email": "...", "password": "...", "nombre": "..." }
// -------------------------------------------------------
function handleRegister(PDO $db, string $prefix): void
{
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $nombre = $input['nombre'] ?? '';

    if (!$email || !$password || !$nombre) {
        jsonError('Todos los campos son obligatorios');
    }

    // Verificar que el email no existe
    $stmt = $db->prepare("SELECT ID FROM {$prefix}users WHERE user_email = :email");
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        jsonError('Ya existe un usuario con ese email');
    }

    // Crear usuario
    $hash = wp_hash_password($password);
    $login = explode('@', $email)[0]; // user_login = parte antes del @

    $stmt = $db->prepare("
        INSERT INTO {$prefix}users (user_login, user_email, user_pass, display_name, user_registered)
        VALUES (:login, :email, :pass, :name, NOW())
    ");
    $stmt->execute([
        'login' => $login,
        'email' => $email,
        'pass' => $hash,
        'name' => $nombre,
    ]);

    $userId = $db->lastInsertId();

    // Guardar metadata
    $metas = [
        'first_name' => $nombre,
        'last_name' => '',
        'nickname' => $login,
        "{$prefix}capabilities" => serialize(['subscriber' => true]),
    ];

    $stmtMeta = $db->prepare("
        INSERT INTO {$prefix}usermeta (user_id, meta_key, meta_value)
        VALUES (:user_id, :key, :value)
    ");

    foreach ($metas as $key => $value) {
        $stmtMeta->execute(['user_id' => $userId, 'key' => $key, 'value' => $value]);
    }

    // Generar token
    $token = createJWT([
        'user_id' => $userId,
        'email' => $email,
        'name' => $nombre,
    ]);

    jsonResponse([
        'token' => $token,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'display_name' => $nombre,
            'user_metadata' => [
                'full_name' => $nombre,
            ]
        ]
    ], 201);
}

// -------------------------------------------------------
// GET /auth.php?action=me (con token en Authorization)
// -------------------------------------------------------
function handleMe(PDO $db, string $prefix): void
{
    $auth = requireAuth();

    $stmt = $db->prepare("
        SELECT u.ID, u.user_email, u.display_name,
               MAX(CASE WHEN um.meta_key = 'avatar_url' THEN um.meta_value END) as avatar_url,
               MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END) as first_name,
               MAX(CASE WHEN um.meta_key = 'last_name' THEN um.meta_value END) as last_name
        FROM {$prefix}users u
        LEFT JOIN {$prefix}usermeta um ON u.ID = um.user_id
        WHERE u.ID = :id
        GROUP BY u.ID
    ");
    $stmt->execute(['id' => $auth['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Usuario no encontrado', 404);
    }

    jsonResponse([
        'id' => $user['ID'],
        'email' => $user['user_email'],
        'display_name' => $user['display_name'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'avatar_url' => $user['avatar_url'],
        'user_metadata' => [
            'full_name' => $user['display_name'],
            'avatar_url' => $user['avatar_url'],
        ]
    ]);
}
