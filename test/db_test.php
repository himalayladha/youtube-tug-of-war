<?php
// Unit verification script for db.php and schema.sql
require_once __DIR__ . '/../includes/db.php';

echo "Running PHP DB & Schema test...\n";

// 1. Check syntax and function existence
$functions = ['getDbConnection', 'runSchemaMigration', 'getSetting', 'setSetting', 'getAllSettings'];
foreach ($functions as $fn) {
    if (!function_exists($fn)) {
        echo "FAIL: Function {$fn} does not exist!\n";
        exit(1);
    }
}
echo "✓ All DB functions declared correctly.\n";

// 2. Test schema file validity
$schemaFile = __DIR__ . '/../db/schema.sql';
if (!file_exists($schemaFile)) {
    echo "FAIL: schema.sql missing!\n";
    exit(1);
}

$sql = file_get_contents($schemaFile);
if (strpos($sql, 'CREATE TABLE IF NOT EXISTS `settings`') === false) {
    echo "FAIL: schema.sql missing settings table!\n";
    exit(1);
}
if (strpos($sql, 'CREATE TABLE IF NOT EXISTS `stream_sessions`') === false) {
    echo "FAIL: schema.sql missing stream_sessions table!\n";
    exit(1);
}
if (strpos($sql, 'CREATE TABLE IF NOT EXISTS `leaderboard`') === false) {
    echo "FAIL: schema.sql missing leaderboard table!\n";
    exit(1);
}
if (strpos($sql, 'CREATE TABLE IF NOT EXISTS `chat_logs`') === false) {
    echo "FAIL: schema.sql missing chat_logs table!\n";
    exit(1);
}

echo "✓ schema.sql verified with all 4 required tables.\n";
echo "✓ Task 1 verification PASSED.\n";
exit(0);
