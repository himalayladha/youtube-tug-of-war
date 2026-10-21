#!/usr/bin/env bash
# ==============================================================================
# Google Cloud Compute Engine (GCE) 24/7 Autonomous Stream Deployment Script
# Target: Ubuntu 22.04 LTS / 24.04 LTS on Google Cloud Compute Engine VM
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}====================================================================${NC}"
echo -e "${BOLD}${CYAN}  Google Cloud GCE - 24/7 Autonomous YouTube Live Streamer Setup   ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""

# 1. Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo:${NC}"
  echo -e "sudo bash deploy_gcp.sh"
  exit 1
fi

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo -e "${GREEN}[*] Project directory: ${PROJECT_DIR}${NC}"

# 2. Update package repositories
echo -e "\n${YELLOW}[1/5] Updating Ubuntu packages...${NC}"
apt-get update -y

# 3. Install Apache, PHP 8.x (with SQLite & MySQL), FFmpeg, and System Tools
echo -e "\n${YELLOW}[2/5] Installing Apache, PHP, FFmpeg, and multimedia utilities...${NC}"
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl wget git unzip software-properties-common ca-certificates gnupg \
  apache2 libapache2-mod-php php php-cli php-mysql php-sqlite3 php-curl php-json php-mbstring php-xml \
  ffmpeg

# 4. Install Node.js 20.x, PM2 & Puppeteer Rendering Libraries
echo -e "\n${YELLOW}[3/5] Installing Node.js 20 LTS, PM2 Process Manager, and Chromium dependencies...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 globally for 24/7 auto-recovery
npm install -g pm2

# Install headless Chromium system libraries
apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2

# 5. Install Node dependencies in streamer directory
echo -e "\n${YELLOW}[4/5] Installing Puppeteer streamer packages...${NC}"
if [ -d "$PROJECT_DIR/streamer" ]; then
  cd "$PROJECT_DIR/streamer"
  npm install --production
  cd "$PROJECT_DIR"
fi

# 6. Configure Apache Web Server
echo -e "\n${YELLOW}[5/5] Configuring Apache web server & permissions...${NC}"
a2enmod rewrite

# Deploy code to /var/www/html if not already running there
if [ "$PROJECT_DIR" != "/var/www/html" ]; then
  echo "Linking/syncing files to /var/www/html..."
  # Backup default apache index.html if present
  if [ -f "/var/www/html/index.html" ] && [ ! -f "/var/www/html/game/index.html" ]; then
    rm -f /var/www/html/index.html
  fi
  cp -r "$PROJECT_DIR"/* /var/www/html/
  cp -r "$PROJECT_DIR"/.[!.]* /var/www/html/ 2>/dev/null || true
  TARGET_DIR="/var/www/html"
else
  TARGET_DIR="$PROJECT_DIR"
fi

# Ensure data directory and permissions
mkdir -p "$TARGET_DIR/data" "$TARGET_DIR/streamer"
chown -R www-data:www-data "$TARGET_DIR"
chmod -R 775 "$TARGET_DIR/data"
chmod -R 775 "$TARGET_DIR/streamer"
systemctl restart apache2

# Detect External IP
SERVER_IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${BOLD}${GREEN}  Deployment Complete! Your Google Cloud 24/7 Server is Ready.     ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
echo -e "Web Server URL     : ${CYAN}http://${SERVER_IP}/${NC}"
echo -e "Game Display Screen: ${CYAN}http://${SERVER_IP}/game/index.html?stream=1${NC}"
echo -e "Admin Control Panel: ${CYAN}http://${SERVER_IP}/admin/${NC}"
echo ""
echo -e "${BOLD}${YELLOW}HOW TO START 24/7 AUTONOMOUS STREAMING:${NC}"
echo -e "You can start the stream in either of two ways:"
echo ""
echo -e "${BOLD}Method A (Easiest - via Web Admin):${NC}"
echo -e " 1. Open ${CYAN}http://${SERVER_IP}/admin/${NC} in your browser."
echo -e " 2. Click ${BOLD}Settings${NC}, paste your YouTube Stream Key, and click Save."
echo -e " 3. Click ${GREEN}[Start Live Stream]${NC}. The server will stream 24/7 continuously."
echo ""
echo -e "${BOLD}Method B (Rock-Solid PM2 Background Service):${NC}"
echo -e " Run this command in your SSH terminal (replace YOUR_STREAM_KEY with your YouTube key):"
echo ""
echo -e " ${CYAN}pm2 start /var/www/html/streamer/stream_daemon.js --name \"yt-stream\" -- \\${NC}"
echo -e " ${CYAN}  --stream-key=\"YOUR_STREAM_KEY\" \\${NC}"
echo -e " ${CYAN}  --url=\"http://localhost/game/index.html?stream=1\" \\${NC}"
echo -e " ${CYAN}  --resolution=1920x1080 --fps=30 --bitrate=4500k${NC}"
echo ""
echo -e " To make it automatically resume if the VM reboots:"
echo -e " ${CYAN}pm2 startup && pm2 save${NC}"
echo ""
echo -e "${GREEN}====================================================================${NC}"
