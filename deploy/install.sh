#!/usr/bin/env bash
# ==============================================================================
# The Great Tug-of-War: Black vs White
# Autonomous 24/7 YouTube Live Server Installer
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS or Debian 11 / 12
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}   The Great Tug-of-War: Black vs White - Autonomous Server Setup   ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""

# 1. Root Privileges Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] This installer must be run as root or with sudo.${NC}"
  echo "Usage: sudo bash install.sh"
  exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo -e "${GREEN}[*] Installing from: ${SCRIPT_DIR}${NC}"

# 2. Update Repositories
echo -e "\n${YELLOW}[1/6] Updating APT repositories...${NC}"
apt-get update -y

# 3. Install Core System Tools
echo -e "\n${YELLOW}[2/6] Installing system utilities...${NC}"
apt-get install -y curl wget git unzip software-properties-common ca-certificates gnupg lsb-release

# 4. Install Apache2 & PHP 8.x
echo -e "\n${YELLOW}[3/6] Installing Apache2 and PHP 8.x with required extensions...${NC}"
apt-get install -y apache2 libapache2-mod-php php php-cli php-mysql php-curl php-json php-mbstring php-xml
a2enmod rewrite
systemctl enable apache2
systemctl restart apache2

# 5. Install MySQL Server & FFmpeg
echo -e "\n${YELLOW}[4/6] Installing MySQL Server and FFmpeg...${NC}"
apt-get install -y mysql-server ffmpeg
systemctl enable mysql
systemctl start mysql

# 6. Install Node.js 20.x & Chromium Shared Libraries
echo -e "\n${YELLOW}[5/6] Installing Node.js LTS and Puppeteer runtime libraries...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo -e "${GREEN}Node.js is already installed ($(node -v)).${NC}"
fi

# Install Headless Chromium GUI/Rendering dependencies for Puppeteer
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

# 7. Configure Permissions and Dependencies
echo -e "\n${YELLOW}[6/6] Configuring application environment and permissions...${NC}"

if [ -d "$SCRIPT_DIR/streamer" ]; then
  cd "$SCRIPT_DIR/streamer"
  echo "Installing Puppeteer in $SCRIPT_DIR/streamer..."
  npm install --production
  cd "$SCRIPT_DIR"
fi

# Set directory permissions for Apache web server
chown -R www-data:www-data "$SCRIPT_DIR"
chmod -R 775 "$SCRIPT_DIR/streamer"

# Allow Apache to write config.php during setup
touch "$SCRIPT_DIR/config.php" 2>/dev/null || true
chown www-data:www-data "$SCRIPT_DIR/config.php" 2>/dev/null || true
chmod 664 "$SCRIPT_DIR/config.php" 2>/dev/null || true

SERVER_IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}                 INSTALLATION COMPLETED SUCCESSFULLY!                ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
echo -e "To complete the setup, open your browser and navigate to:"
echo -e "${CYAN}http://${SERVER_IP}/setup.php${NC}"
echo ""
