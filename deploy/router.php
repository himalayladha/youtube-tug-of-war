<?php
/**
 * Router script for PHP Built-in Web Server (php -S)
 * Designed for Termux, TermuxPanel, and lightweight local testing
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$file = __DIR__ . $uri;

// 1. Serve static files directly
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// 2. Directory index resolution
if (is_dir($file)) {
    if (file_exists($file . '/index.html')) {
        include $file . '/index.html';
        exit;
    }
    if (file_exists($file . '/index.php')) {
        include $file . '/index.php';
        exit;
    }
}

// 3. Fallback to main index.php
require_once __DIR__ . '/index.php';
