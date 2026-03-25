<?php
/**
 * API Status Check
 * Visit: http://localhost:8000/api-status.php
 * 
 * This file helps diagnose issues with the Stripe payment API
 */

// Find the config file
$configPath = __DIR__ . '/api/config.php';

if (!file_exists($configPath)) {
    // Try from current directory
    $configPath = __DIR__ . '/config.php';
}

header('Content-Type: application/json; charset=utf-8');

$status = [];

// Check PHP version
$status['php_version'] = phpversion();
$status['php_sapi'] = php_sapi_name();

// Check extensions
$status['extensions'] = [
    'curl' => extension_loaded('curl'),
    'pdo' => extension_loaded('pdo'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'json' => extension_loaded('json'),
];

// Check config file
$status['config_file_exists'] = file_exists($configPath);

if (file_exists($configPath)) {
    require_once $configPath;
    
    // Check database
    try {
        $db = getDB();
        $status['database'] = [
            'connection' => 'ok',
            'host' => DB_HOST,
            'database' => DB_NAME,
            'prefix' => TABLE_PREFIX
        ];
    } catch (Exception $e) {
        $status['database'] = [
            'connection' => 'error',
            'error' => $e->getMessage()
        ];
    }
    
    // Check Stripe configuration
    $stripeKey = defined('STRIPE_SECRET_KEY') ? STRIPE_SECRET_KEY : getenv('STRIPE_SECRET_KEY');
    $status['stripe'] = [
        'configured' => !empty($stripeKey) && $stripeKey !== 'sk_test_placeholder',
        'key_type' => empty($stripeKey) ? 'NOT_SET' : (substr($stripeKey, 0, 7) === 'sk_test' ? 'TEST' : (substr($stripeKey, 0, 7) === 'sk_live' ? 'LIVE' : 'INVALID')),
        'key_preview' => empty($stripeKey) ? 'NOT SET' : substr($stripeKey, 0, 23) . '...'
    ];
    
} else {
    $status['error'] = 'Config file not found at ' . $configPath;
}

// Check API endpoint
$status['api_endpoint_test'] = 'Visit http://localhost:8000/api/procesar-pago.php?action=debug';

echo json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
