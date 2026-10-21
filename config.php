<?php
/**
 * Autonomous Tug-of-War Configuration
 * Supports SQLite (Default Zero-Config) and MySQL / MariaDB
 */
return [
    'db_driver' => getenv('DB_DRIVER') ?: 'sqlite',
    'db_path'   => getenv('DB_PATH') ?: (__DIR__ . '/data/database.sqlite'),
    'db_host'   => getenv('DB_HOST') ?: 'localhost',
    'db_port'   => getenv('DB_PORT') ?: '3306',
    'db_name'   => getenv('DB_NAME') ?: 'youtube_runner',
    'db_user'   => getenv('DB_USER') ?: 'root',
    'db_pass'   => getenv('DB_PASS') ?: '',
    'app_url'   => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
];
