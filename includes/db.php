<?php
/**
 * Database Helper Functions for YouTube Live Runner
 */

function getDbConnection(?array $config = null): PDO {
    if ($config === null) {
        $configFile = __DIR__ . '/../config.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
        } else {
            throw new Exception("Configuration file not found. Please run setup.php first.");
        }
    }

    $dbHost = $config['db_host'] ?? 'localhost';
    $dbPort = $config['db_port'] ?? '3306';
    $dbName = $config['db_name'] ?? '';
    $dbUser = $config['db_user'] ?? 'root';
    $dbPass = $config['db_pass'] ?? '';

    $dsn = "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4";
    if (!empty($dbName)) {
        $dsn .= ";dbname={$dbName}";
    }

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    return new PDO($dsn, $dbUser, $dbPass, $options);
}

function runSchemaMigration(PDO $pdo, string $sqlPath): bool {
    if (!file_exists($sqlPath)) {
        throw new Exception("Schema file not found at: {$sqlPath}");
    }

    $sql = file_get_contents($sqlPath);
    // Split on semicolons outside of quotes
    $queries = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($queries as $query) {
        if (!empty($query)) {
            $pdo->exec($query);
        }
    }

    return true;
}

function getSetting(PDO $pdo, string $key, $default = null): ?string {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = :k LIMIT 1");
        $stmt->execute([':k' => $key]);
        $row = $stmt->fetch();
        return $row !== false ? (string)$row['setting_value'] : $default;
    } catch (PDOException $e) {
        return $default;
    }
}

function setSetting(PDO $pdo, string $key, string $value): bool {
    $stmt = $pdo->prepare(
        "INSERT INTO settings (setting_key, setting_value) 
         VALUES (:k, :v) 
         ON DUPLICATE KEY UPDATE setting_value = :v2, updated_at = CURRENT_TIMESTAMP"
    );
    return $stmt->execute([':k' => $key, ':v' => $value, ':v2' => $value]);
}

function getAllSettings(PDO $pdo): array {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $results = [];
        while ($row = $stmt->fetch()) {
            $results[$row['setting_key']] = $row['setting_value'];
        }
        return $results;
    } catch (PDOException $e) {
        return [];
    }
}
