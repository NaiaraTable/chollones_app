<?php
// ======================================================
// CONFIGURACIÓN DE LA API - CHOLLONES
// ======================================================

// -- Conexión a MySQL --
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'chollones');
define('TABLE_PREFIX', 'fxuztb_');

// -- URL base del sitio original (para imágenes) --
define('SITE_URL', 'https://chollones.com');

// -- Clave secreta para JWT --
define('JWT_SECRET', 'chollones_app_secret_key_2026');

// -- CORS: permitir llamadas desde Ionic --
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Responder inmediatamente a las peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -- Conexión PDO --
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error de conexión a la base de datos']);
            exit();
        }
    }
    return $pdo;
}

// -- Helpers --
function jsonResponse($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function jsonError(string $message, int $code = 400): void {
    jsonResponse(['error' => $message], $code);
}

// -- JWT simple --
function createJWT(array $payload): string {
    $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + (60 * 60 * 24 * 7); // 7 días
    $payloadEncoded = base64_encode(json_encode($payload));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true));
    return "$header.$payloadEncoded.$signature";
}

function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;

    return $data;
}

function getAuthenticatedUser(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) return null;
    return verifyJWT($matches[1]);
}

function requireAuth(): array {
    $user = getAuthenticatedUser();
    if (!$user) {
        jsonError('No autenticado', 401);
    }
    return $user;
}

// -- Verificación de contraseña WordPress (phpass) --
function wp_check_password(string $password, string $hash): bool {
    // WordPress usa phpass con prefijo $P$
    if (strpos($hash, '$P$') === 0 || strpos($hash, '$H$') === 0) {
        $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        $count_log2 = strpos($itoa64, $hash[3]);
        $count = 1 << $count_log2;
        $salt = substr($hash, 4, 8);

        $checkHash = md5($salt . $password, true);
        do {
            $checkHash = md5($checkHash . $password, true);
        } while (--$count);

        $encoded = '';
        $i = 0;
        $hashLen = 16; // md5 output
        do {
            $value = ord($checkHash[$i++]);
            $encoded .= $itoa64[$value & 0x3f];
            if ($i < $hashLen) $value |= ord($checkHash[$i]) << 8;
            $encoded .= $itoa64[($value >> 6) & 0x3f];
            if ($i++ >= $hashLen) break;
            if ($i < $hashLen) $value |= ord($checkHash[$i]) << 16;
            $encoded .= $itoa64[($value >> 12) & 0x3f];
            if ($i++ >= $hashLen) break;
            $encoded .= $itoa64[($value >> 18) & 0x3f];
        } while ($i < $hashLen);

        $computedHash = '$P$' . $hash[3] . $salt . $encoded;
        return hash_equals($hash, $computedHash);
    }

    // Fallback: bcrypt u otros
    return password_verify($password, $hash);
}

function wp_hash_password(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT);
}
