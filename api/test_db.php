<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=chollones;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Check stores names in usermeta
    $stmt = $pdo->query("SELECT user_id, meta_key, meta_value FROM fxuztb_usermeta WHERE meta_key IN ('dokan_store_name', 'dokan_profile_settings') LIMIT 20");
    $results = $stmt->fetchAll();

    foreach ($results as $row) {
        if ($row['meta_key'] === 'dokan_profile_settings') {
            $settings = @unserialize($row['meta_value']);
            echo "User ID: " . $row['user_id'] . " | Store Name: " . ($settings['store_name'] ?? 'N/A') . "\n";
        } else {
            echo "User ID: " . $row['user_id'] . " | " . $row['meta_key'] . ": " . $row['meta_value'] . "\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
