#!/usr/bin/env bash
# ==============================================================================
# The Great Tug-of-War: Black vs White
# 1-Tap Setup Helper for Android Termux & TermuxPanel
# ==============================================================================

set -e

echo "===================================================================="
echo "    The Great Tug-of-War: Black vs White - Termux Setup Helper      "
echo "===================================================================="
echo ""

# 1. Install Required Termux Packages
echo "[1/4] Installing PHP, SQLite, Node.js & FFmpeg..."
pkg update -y && pkg install -y php php-sqlite sqlite nodejs-lts ffmpeg

# 2. Prepare Storage Directory
echo "[2/4] Initializing local database directory..."
mkdir -p data

# 3. Streamer Node Dependencies (Optional for background streaming)
if [ -d "streamer" ]; then
  echo "[3/4] Checking streamer dependencies..."
  cd streamer
  npm install --production 2>/dev/null || true
  cd ..
fi

# 4. Permissions
echo "[4/4] Finalizing file permissions..."
chmod -R 755 .
touch config.php 2>/dev/null || true
chmod 664 config.php 2>/dev/null || true

echo ""
echo "===================================================================="
echo "                   TERMUX ENVIRONMENT IS READY!                     "
echo "===================================================================="
echo ""
echo "HOW TO HOST ON TERMUXPANEL (Android Control Panel):"
echo "--------------------------------------------------"
echo "1. Open TermuxPanel at http://127.0.0.1:9000"
echo "2. Click 'Websites' -> '+ Create Website'"
echo "3. Configure:"
echo "     - Site Name: tug-of-war"
echo "     - Runtime:   PHP (Built-in Server)"
echo "     - Domain:    yourdomain.com (or leave blank)"
echo "4. Move or link this folder into:"
echo "     ~/termux-panel/storage/websites/tug-of-war/"
echo "5. Open your assigned website port in your phone browser, e.g.:"
echo "     http://127.0.0.1:8100/setup.php"
echo "6. Select 'SQLite (Zero-Config)' in the setup wizard — Done!"
echo ""
echo "OR RUN STANDALONE RIGHT NOW:"
echo "----------------------------"
echo "php -S 0.0.0.0:8080 router.php"
echo "Then visit: http://127.0.0.1:8080/setup.php"
echo ""
