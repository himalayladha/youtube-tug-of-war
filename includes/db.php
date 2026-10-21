<?php
/**
 * Database Helper Functions for YouTube Live Runner & Tug-of-War
 * Supports MySQL / MariaDB and pure SQLite (Termux / TermuxPanel)
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

    $dbDriver = strtolower($config['db_driver'] ?? ($config['db_type'] ?? 'mysql'));

    // SQLite Mode (Ideal for Android Termux & TermuxPanel with 0 configuration)
    if ($dbDriver === 'sqlite' || (!empty($config['db_path']) && empty($config['db_host']))) {
        $dbPath = $config['db_path'] ?? (__DIR__ . '/../data/database.sqlite');
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $pdo = new PDO("sqlite:{$dbPath}", null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("PRAGMA journal_mode = WAL;");

        // Auto-initialize SQLite schema if settings table is missing
        $tableCheck = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")->fetch();
        if (!$tableCheck) {
            $schemaPath = __DIR__ . '/../db/schema_sqlite.sql';
            if (file_exists($schemaPath)) {
                runSchemaMigration($pdo, $schemaPath);
            }
        }

        return $pdo;
    }

    // MySQL / MariaDB Mode
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
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $stmt = $pdo->prepare(
            "INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v)
             ON CONFLICT(setting_key) DO UPDATE SET setting_value = :v2, updated_at = CURRENT_TIMESTAMP"
        );
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v)
             ON DUPLICATE KEY UPDATE setting_value = :v2, updated_at = CURRENT_TIMESTAMP"
        );
    }
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
