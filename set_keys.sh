#!/usr/bin/env bash
# ==============================================================================
# Helper Script to Set/Update YouTube API Key and Stream Key from Command Line
# Usage:
#   sudo bash set_keys.sh --api-key="YOUR_KEY" --stream-key="YOUR_KEY"
#   sudo bash set_keys.sh "YOUR_KEY" "YOUR_STREAM_KEY"
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_KEY=""
STREAM_KEY=""
VIDEO_ID=""

for arg in "$@"; do
  case $arg in
    --api-key=*|--yt-api-key=*)
      API_KEY="${arg#*=}"
      shift
      ;;
    --stream-key=*|--yt-stream-key=*)
      STREAM_KEY="${arg#*=}"
      shift
      ;;
    --video-id=*|--yt-video-id=*)
      VIDEO_ID="${arg#*=}"
      shift
      ;;
  esac
done

# If positional arguments are passed:
if [ -z "$API_KEY" ] && [ -n "$1" ] && [[ "$1" != --* ]]; then
  API_KEY="$1"
fi
if [ -z "$STREAM_KEY" ] && [ -n "$2" ] && [[ "$2" != --* ]]; then
  STREAM_KEY="$2"
fi

# Fallback to environment variables
API_KEY="${API_KEY:-$YOUTUBE_API_KEY}"
STREAM_KEY="${STREAM_KEY:-$YOUTUBE_STREAM_KEY}"

# Detect project directory
if [ -f "/var/www/html/includes/db.php" ]; then
  BASE_DIR="/var/www/html"
else
  BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

if [ ! -f "$BASE_DIR/includes/db.php" ]; then
  echo -e "${RED}[Error] Could not find includes/db.php in $BASE_DIR${NC}"
  exit 1
fi

php -r "
require '$BASE_DIR/includes/db.php';
\$pdo = getDbConnection();
if (!empty('$API_KEY')) {
    setSetting(\$pdo, 'yt_api_key', '$API_KEY');
    echo '[Success] YouTube Data API v3 Key updated in database.' . PHP_EOL;
}
if (!empty('$STREAM_KEY')) {
    setSetting(\$pdo, 'yt_stream_key', '$STREAM_KEY');
    echo '[Success] YouTube Live Stream Key updated in database.' . PHP_EOL;
}
if (!empty('$VIDEO_ID')) {
    setSetting(\$pdo, 'yt_video_id', '$VIDEO_ID');
    setSetting(\$pdo, 'yt_live_chat_id', '');
    setSetting(\$pdo, 'yt_page_token', '');
    echo '[Success] YouTube Live Video ID updated in database: $VIDEO_ID' . PHP_EOL;
}
"

echo -e "${GREEN}Keys successfully updated!${NC}"
