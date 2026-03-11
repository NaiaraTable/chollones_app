<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$db = getDB();
$prefix = TABLE_PREFIX;

// Helper para actualizar o insertar en usermeta
function updateUserMetaGeo($db, $prefix, $userId, $metaKey, $metaValue)
{
    $stmt = $db->prepare("SELECT umeta_id FROM {$prefix}usermeta WHERE user_id = ? AND meta_key = ?");
    $stmt->execute([$userId, $metaKey]);
    $exists = $stmt->fetchColumn();

    if ($exists) {
        $update = $db->prepare("UPDATE {$prefix}usermeta SET meta_value = ? WHERE umeta_id = ?");
        $update->execute([$metaValue, $exists]);
    } else {
        $insert = $db->prepare("INSERT INTO {$prefix}usermeta (user_id, meta_key, meta_value) VALUES (?, ?, ?)");
        $insert->execute([$userId, $metaKey, $metaValue]);
    }
}

// 1. Obtener todos los chollos y agruparlos por el autor (proveedor)
$sql = "SELECT DISTINCT p.post_author, u.display_name 
        FROM {$prefix}posts p 
        JOIN {$prefix}users u ON p.post_author = u.ID 
        WHERE p.post_type = 'product' OR p.post_type = 'chollos'";
$stmt = $db->query($sql);
$autores = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Si falla por tipo de post, cogemos cualquiera que haya publicado
if (empty($autores)) {
    $sql = "SELECT DISTINCT p.post_author, u.display_name 
            FROM {$prefix}posts p 
            JOIN {$prefix}users u ON p.post_author = u.ID";
    $stmt = $db->query($sql);
    $autores = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$resultados = [];

foreach ($autores as $autor) {
    $userId = $autor['post_author'];
    $nombre = trim($autor['display_name']);

    // Evitamos buscar "Admin" u otros nombres genéricos
    if (empty($nombre) || strtolower($nombre) === 'admin' || strtolower($nombre) === 'naiara')
        continue;

    // Primero, buscamos asumiendo que es en Sevilla (para ser precisos con tiendas locales)
    $queryStr = urlencode($nombre . " Sevilla España");
    $url = "https://nominatim.openstreetmap.org/search?q={$queryStr}&format=json&limit=1";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // Nominatim pide por favor que incluyamos un user-agent válido
    curl_setopt($ch, CURLOPT_USERAGENT, "ChollonesAppGeolocationScript/1.0");
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $json = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    sleep(1); // Nominatim exige 1 segundo de retraso entre peticiones

    $encontrado = false;

    if ($httpCode === 200 && $json) {
        $data = json_decode($json, true);
        if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
            $lat = $data[0]['lat'];
            $lon = $data[0]['lon'];

            updateUserMetaGeo($db, $prefix, $userId, 'dokan_geo_latitude', $lat);
            updateUserMetaGeo($db, $prefix, $userId, 'dokan_geo_longitude', $lon);

            $resultados[] = [
                'proveedor' => $nombre,
                'status' => 'OK (Sevilla)',
                'lat' => $lat,
                'lng' => $lon
            ];
            $encontrado = true;
        }
    }

    // Si no lo encuentra en Sevilla, busca genéricamente en España
    if (!$encontrado) {
        $queryStr2 = urlencode($nombre . " España");
        $url2 = "https://nominatim.openstreetmap.org/search?q={$queryStr2}&format=json&limit=1";

        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $url2);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_USERAGENT, "ChollonesAppGeolocationScript/1.0");
        $json2 = curl_exec($ch2);
        curl_close($ch2);

        sleep(1);

        $data2 = json_decode($json2, true);
        if (!empty($data2) && isset($data2[0]['lat']) && isset($data2[0]['lon'])) {
            $lat = $data2[0]['lat'];
            $lon = $data2[0]['lon'];

            updateUserMetaGeo($db, $prefix, $userId, 'dokan_geo_latitude', $lat);
            updateUserMetaGeo($db, $prefix, $userId, 'dokan_geo_longitude', $lon);

            $resultados[] = [
                'proveedor' => $nombre,
                'status' => 'OK (España)',
                'lat' => $lat,
                'lng' => $lon
            ];
        } else {
            $resultados[] = [
                'proveedor' => $nombre,
                'status' => 'NO ENCONTRADO',
                'nota' => 'No hay resultados en OpenStreetMap (intenta poner la dirección a mano)'
            ];
        }
    }
}

echo json_encode([
    'mensaje' => 'Proceso de geolocalización completado',
    'total_procesados' => count($resultados),
    'resultados' => $resultados
]);
