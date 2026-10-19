#!/usr/bin/env python3
"""
The Great Tug-of-War: YouTube Data API v3 Studio & Live Poller Daemon
Author: Antigravity
Provides automated YouTube Live Broadcast & Stream management (OAuth 2.0)
and resilient Live Chat vote polling syncing to SQLite & MySQL.
"""

import os
import sys
import re
import json
import time
import signal
import hashlib
import argparse
import warnings
warnings.filterwarnings('ignore')
from datetime import datetime, timezone

# Optional PyMySQL (for MySQL / MariaDB on XAMPP/VPS)
try:
    import pymysql
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False

import sqlite3

# Google API Client & OAuth Libraries
try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False


SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly'
]

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.php')
TOKEN_PATH = os.path.join(BASE_DIR, 'backend', 'token.json')
CLIENT_SECRETS_PATH = os.path.join(BASE_DIR, 'backend', 'client_secret.json')
PID_FILE = os.path.join(BASE_DIR, 'streamer', 'python_poller.pid')
LOG_FILE = os.path.join(BASE_DIR, 'logs', 'python_poller.log')


class DatabaseHelper:
    """Universal Database Interface supporting both MySQL (XAMPP/VPS) and SQLite (Termux/Android)"""
    def __init__(self, config=None):
        self.config = config or self.load_php_config()
        self.is_sqlite = False
        self.conn = None
        self.connect()

    @staticmethod
    def load_php_config():
        """Parses basic config.php into a Python dict"""
        cfg = {
            'db_driver': 'mysql',
            'db_host': 'localhost',
            'db_port': '3306',
            'db_name': 'youtube_runner',
            'db_user': 'root',
            'db_pass': '',
            'db_path': os.path.join(BASE_DIR, 'data', 'database.sqlite')
        }
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Extract key => 'val' pairs
                matches = re.findall(r"['\"]([a-zA-Z0-9_]+)['\"]\s*=>\s*['\"]([^'\"]*)['\"]", content)
                for k, v in matches:
                    cfg[k] = v
            except Exception as e:
                print(f"[DB] Warning reading config.php: {e}", file=sys.stderr)
        return cfg

    def connect(self):
        driver = self.config.get('db_driver', 'mysql').lower()
        db_path = self.config.get('db_path')
        
        # Check SQLite mode
        if driver == 'sqlite' or (db_path and not self.config.get('db_host')):
            self.is_sqlite = True
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            self.conn = sqlite3.connect(db_path, timeout=30.0, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA journal_mode = WAL;")
        else:
            # MySQL Mode
            if not HAS_PYMYSQL:
                raise RuntimeError("PyMySQL package is required for MySQL mode. Run: pip install pymysql")
            self.is_sqlite = False
            self.conn = pymysql.connect(
                host=self.config.get('db_host', 'localhost'),
                port=int(self.config.get('db_port', 3306)),
                user=self.config.get('db_user', 'root'),
                password=self.config.get('db_pass', ''),
                database=self.config.get('db_name', 'youtube_runner'),
                charset='utf8mb4',
                autocommit=True,
                cursorclass=pymysql.cursors.DictCursor
            )

    def execute(self, sql, params=None):
        params = params or {}
        if self.is_sqlite:
            # Convert MySQL NOW() to datetime('now')
            sql_clean = sql.replace("NOW()", "datetime('now')")
            # Support both :param and param key styles in dictionary
            sqlite_params = {}
            for k, v in params.items():
                stripped = k.lstrip(':')
                sqlite_params[stripped] = v
                sqlite_params[':' + stripped] = v
            cur = self.conn.cursor()
            cur.execute(sql_clean, sqlite_params)
            self.conn.commit()
            return cur
        else:
            # MySQL
            cur = self.conn.cursor()
            cur.execute(sql, params)
            return cur

    def fetchone(self, sql, params=None):
        cur = self.execute(sql, params)
        return cur.fetchone()

    def fetchall(self, sql, params=None):
        cur = self.execute(sql, params)
        return cur.fetchall()

    def get_setting(self, key, default=''):
        sql = "SELECT setting_value FROM settings WHERE setting_key = %(k)s" if not self.is_sqlite else "SELECT setting_value FROM settings WHERE setting_key = :k"
        param = {'k': key}
        row = self.fetchone(sql, param)
        if row:
            return row['setting_value'] if isinstance(row, dict) else row[0]
        return default

    def set_setting(self, key, value):
        if self.is_sqlite:
            sql = "INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v) ON CONFLICT(setting_key) DO UPDATE SET setting_value = :v2"
            self.execute(sql, {'k': key, 'v': str(value), 'v2': str(value)})
        else:
            sql = "INSERT INTO settings (setting_key, setting_value) VALUES (%(k)s, %(v)s) ON DUPLICATE KEY UPDATE setting_value = %(v2)s"
            self.execute(sql, {'k': key, 'v': str(value), 'v2': str(value)})


class YouTubeManager:
    """Manages YouTube Live Broadcasts, RTMP Stream Keys, and Live Chat polling"""
    def __init__(self, db=None, client_secrets_file=None, token_file=None, api_key=None):
        self.db = db or DatabaseHelper()
        self.client_secrets_file = client_secrets_file or CLIENT_SECRETS_PATH
        self.token_file = token_file or TOKEN_PATH
        self.api_key = api_key or self.db.get_setting('yt_api_key', '')
        self.service = None
        self.is_running = False

    def get_service(self, require_oauth=False):
        """Constructs and returns an authenticated Google YouTube service"""
        if not HAS_GOOGLE_AUTH:
            raise RuntimeError("Google API Client is not installed. Run: pip install google-api-python-client google-auth-oauthlib")

        creds = None
        # 1. Try loading existing OAuth token
        if os.path.exists(self.token_file):
            try:
                creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
            except Exception as e:
                print(f"[OAuth] Could not parse token file: {e}")

        # 2. Refresh or re-authorize if needed
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(self.token_file, 'w', encoding='utf-8') as f:
                    f.write(creds.to_json())
                print("[OAuth] Token successfully refreshed.")
            except Exception as e:
                print(f"[OAuth] Refresh failed: {e}")
                creds = None

        if creds and creds.valid:
            self.service = build('youtube', 'v3', credentials=creds)
            return self.service

        if require_oauth:
            if not os.path.exists(self.client_secrets_file):
                raise FileNotFoundError(f"Missing OAuth client secret at: {self.client_secrets_file}")
            flow = InstalledAppFlow.from_client_secrets_file(self.client_secrets_file, SCOPES)
            creds = flow.run_local_server(port=0)
            os.makedirs(os.path.dirname(self.token_file), exist_ok=True)
            with open(self.token_file, 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
            self.service = build('youtube', 'v3', credentials=creds)
            return self.service

        # 3. Fallback to API Key (read-only live chat)
        if self.api_key:
            self.service = build('youtube', 'v3', developerKey=self.api_key)
            return self.service

        raise RuntimeError("No valid credentials found. Please supply client_secret.json or an API Key.")

    # -------------------------------------------------------------
    # Broadcast & Stream Management (OAuth 2.0 Required)
    # -------------------------------------------------------------
    def create_live_broadcast(self, title, description="Live Tug-of-War Interactive Stream", privacy_status="unlisted"):
        """Creates a YouTube Live Broadcast resource"""
        service = self.get_service(require_oauth=True)
        now_iso = datetime.now(timezone.utc).isoformat()
        
        body = {
            'snippet': {
                'title': title,
                'description': description,
                'scheduledStartTime': now_iso
            },
            'status': {
                'privacyStatus': privacy_status,
                'selfDeclaredMadeForKids': False
            },
            'contentDetails': {
                'enableAutoStart': True,
                'enableAutoStop': True,
                'enableDvr': True,
                'latencyPreference': 'ultraLow' # Lowest latency for chat interactive game!
            }
        }
        res = service.liveBroadcasts().insert(part='snippet,status,contentDetails', body=body).execute()
        return res

    def create_live_stream(self, title, resolution='1080p', frame_rate='60fps'):
        """Creates a YouTube RTMP ingestion stream with high-framerate support"""
        service = self.get_service(require_oauth=True)
        body = {
            'snippet': {
                'title': f"{title} - Ingest Stream"
            },
            'cdn': {
                'frameRate': frame_rate,
                'ingestionType': 'rtmp',
                'resolution': resolution
            }
        }
        res = service.liveStreams().insert(part='snippet,cdn', body=body).execute()
        return res

    def bind_broadcast_stream(self, broadcast_id, stream_id):
        """Binds a Live Broadcast to an Ingest Stream"""
        service = self.get_service(require_oauth=True)
        res = service.liveBroadcasts().bind(
            id=broadcast_id,
            streamId=stream_id,
            part='id,snippet,contentDetails,status'
        ).execute()
        return res

    def setup_full_stream(self, title="The Great Tug-of-War: Live Interactive Arena", description=None, privacy="unlisted", resolution="1080p", fps="60fps"):
        """
        Orchestrates full setup:
        1. Creates live broadcast
        2. Creates 1080p 60fps RTMP stream
        3. Binds them
        4. Saves video ID, stream key, and activeLiveChatId to local DB!
        """
        desc = description or "Interactive YouTube Live Stream Arena. Comment 1 or BLACK / 2 or WHITE to pull!"
        print(f"[YouTubeStudio] 1. Creating Live Broadcast: '{title}' ({privacy})...")
        broadcast = self.create_live_broadcast(title, desc, privacy)
        broadcast_id = broadcast['id']
        live_chat_id = broadcast['snippet'].get('liveChatId', '')

        print(f"[YouTubeStudio] 2. Creating Ingestion Stream ({resolution} {fps})...")
        stream = self.create_live_stream(title, resolution, fps)
        stream_id = stream['id']
        ingestion_info = stream['cdn']['ingestionInfo']
        rtmp_url = ingestion_info['ingestionAddress']
        stream_key = ingestion_info['streamName']

        print(f"[YouTubeStudio] 3. Binding Broadcast '{broadcast_id}' to Stream '{stream_id}'...")
        bound = self.bind_broadcast_stream(broadcast_id, stream_id)
        if not live_chat_id:
            live_chat_id = bound['snippet'].get('liveChatId', '')

        # Save to database
        self.db.set_setting('yt_video_id', broadcast_id)
        self.db.set_setting('yt_stream_key', stream_key)
        if live_chat_id:
            self.db.set_setting('yt_live_chat_id', live_chat_id)
        self.db.set_setting('stream_resolution', '1920x1080' if resolution == '1080p' else '1280x720')
        self.db.set_setting('stream_fps', '60' if fps == '60fps' else '30')

        result = {
            'success': True,
            'video_id': broadcast_id,
            'stream_id': stream_id,
            'stream_key': stream_key,
            'rtmp_url': rtmp_url,
            'live_chat_id': live_chat_id,
            'watch_url': f"https://www.youtube.com/watch?v={broadcast_id}"
        }
        print(f"[YouTubeStudio] Done! Watch: {result['watch_url']}")
        print(f"[YouTubeStudio] RTMP Stream Key configured in DB: {stream_key[:6]}...")
        return result

    # -------------------------------------------------------------
    # Live Chat Parsing & Scoring Engine
    # -------------------------------------------------------------
    @staticmethod
    def parse_vote(text):
        """Identifies spectator vote: 'BLACK' or 'WHITE' or None"""
        if not text:
            return None
        clean = text.strip().lower()
        
        # Exact numeric or lane triggers
        if clean in ('1', 'lane1', 'left'):
            return 'BLACK'
        if clean in ('2', 'lane2', 'right'):
            return 'WHITE'

        # Keyword match
        if clean.startswith('black') or clean.startswith('with'):
            return 'BLACK'
        if clean.startswith('white') or clean.startswith('against'):
            return 'WHITE'

        return None

    def record_vote(self, user_id, user_name, team, raw_text):
        """Records vote in chat_logs and updates leaderboard score"""
        # 1. Insert chat log
        if self.db.is_sqlite:
            sql_log = "INSERT INTO chat_logs (user_name, raw_text, team, created_at) VALUES (:u, :t, :a, datetime('now'))"
            self.db.execute(sql_log, {':u': user_name, ':t': raw_text, ':a': team})
            
            sql_lead = """
            INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active)
            VALUES (:uid, :name, :team, 1, 10, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                team = :team2,
                total_votes = total_votes + 1,
                score = score + 10,
                last_active = datetime('now')
            """
            self.db.execute(sql_lead, {':uid': user_id, ':name': user_name, ':team': team, ':team2': team})
        else:
            sql_log = "INSERT INTO chat_logs (user_name, raw_text, team, created_at) VALUES (%(u)s, %(t)s, %(a)s, NOW())"
            self.db.execute(sql_log, {'u': user_name, 't': raw_text, 'a': team})

            sql_lead = """
            INSERT INTO leaderboard (user_id, user_name, team, total_votes, score, last_active)
            VALUES (%(uid)s, %(name)s, %(team)s, 1, 10, NOW())
            ON DUPLICATE KEY UPDATE
                team = %(team2)s,
                total_votes = total_votes + 1,
                score = score + 10,
                last_active = NOW()
            """
            self.db.execute(sql_lead, {'uid': user_id, 'name': user_name, 'team': team, 'team2': team})

    # -------------------------------------------------------------
    # Resilient Live Chat Daemon
    # -------------------------------------------------------------
    def resolve_live_chat_id(self):
        """Discovers the active liveChatId for the configured video_id"""
        live_chat_id = self.db.get_setting('yt_live_chat_id', '')
        if live_chat_id:
            return live_chat_id

        video_id = self.db.get_setting('yt_video_id', '')
        if not video_id:
            return None

        service = self.get_service()
        res = service.videos().list(part='liveStreamingDetails', id=video_id).execute()
        if not res.get('items'):
            return None
        
        live_details = res['items'][0].get('liveStreamingDetails', {})
        live_chat_id = live_details.get('activeLiveChatId')
        if live_chat_id:
            self.db.set_setting('yt_live_chat_id', live_chat_id)
        return live_chat_id

    def poll_chat_step(self, live_chat_id, page_token=None):
        """Performs a single polling cycle of YouTube live chat"""
        service = self.get_service()
        req = service.liveChatMessages().list(
            liveChatId=live_chat_id,
            part='snippet,authorDetails',
            pageToken=page_token
        )
        res = req.execute()
        
        next_page = res.get('nextPageToken')
        polling_ms = res.get('pollingIntervalMillis', 2500)
        items = res.get('items', [])
        
        votes_ingested = 0
        for item in items:
            raw_text = item.get('snippet', {}).get('displayMessage', '')
            author_details = item.get('authorDetails', {})
            author_name = author_details.get('displayName', 'Viewer')
            author_id = author_details.get('channelId') or hashlib.md5(author_name.encode('utf-8')).hexdigest()

            team = self.parse_vote(raw_text)
            if team:
                self.record_vote(author_id, author_name, team, raw_text)
                votes_ingested += 1

        return {
            'next_page_token': next_page,
            'polling_interval_ms': polling_ms,
            'votes_count': votes_ingested,
            'messages_count': len(items)
        }

    def run_chat_daemon(self):
        """Continuous live chat ingestion loop with adaptive backoff"""
        self.is_running = True
        os.makedirs(os.path.dirname(PID_FILE), exist_ok=True)
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

        with open(PID_FILE, 'w') as f:
            f.write(str(os.getpid()))

        def handle_stop(signum, frame):
            print(f"\n[YouTubeDaemon] Received signal {signum}. Shutting down cleanly...")
            self.is_running = False

        signal.signal(signal.SIGINT, handle_stop)
        signal.signal(signal.SIGTERM, handle_stop)

        print(f"[YouTubeDaemon] Started PID: {os.getpid()}")
        page_token = self.db.get_setting('yt_page_token', '')

        while self.is_running:
            try:
                live_chat_id = self.resolve_live_chat_id()
                if not live_chat_id:
                    print("[YouTubeDaemon] Waiting for live chat ID (stream live?)...")
                    time.sleep(5.0)
                    continue

                res = self.poll_chat_step(live_chat_id, page_token)
                page_token = res['next_page_token']
                if page_token:
                    self.db.set_setting('yt_page_token', page_token)

                if res['votes_count'] > 0:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Ingested {res['votes_count']} votes ({res['messages_count']} comments).")

                delay = max(1000, res['polling_interval_ms']) / 1000.0
                time.sleep(delay)

            except Exception as e:
                print(f"[YouTubeDaemon] Error in polling loop: {e}", file=sys.stderr)
                time.sleep(5.0)

        # Cleanup PID on exit
        if os.path.exists(PID_FILE):
            try:
                os.remove(PID_FILE)
            except OSError:
                pass
        print("[YouTubeDaemon] Stopped.")


def main():
    parser = argparse.ArgumentParser(description="YouTube Data API v3 Studio & Live Poller")
    parser.add_argument('--create-stream', action='store_true', help="Auto-create YouTube Live Broadcast and RTMP stream")
    parser.add_argument('--title', type=str, default="The Great Tug-of-War: Live Arena", help="Stream Title")
    parser.add_argument('--desc', type=str, default="", help="Stream Description")
    parser.add_argument('--privacy', type=str, default="unlisted", choices=['public', 'unlisted', 'private'], help="Stream Privacy")
    parser.add_argument('--resolution', type=str, default="1080p", choices=['1080p', '720p', '480p'], help="Resolution")
    parser.add_argument('--fps', type=str, default="60fps", choices=['60fps', '30fps'], help="Frame rate")
    parser.add_argument('--poll-chat', action='store_true', help="Start continuous live chat poller daemon")
    parser.add_argument('--test-vote', type=str, help="Test vote parser with custom text")
    parser.add_argument('--status', action='store_true', help="Show current DB and stream configuration status")

    args = parser.parse_args()
    manager = YouTubeManager()

    if args.test_vote is not None:
        team = manager.parse_vote(args.test_vote)
        print(f"Input: '{args.test_vote}' -> Parsed Team: {team}")
        return

    if args.status:
        video_id = manager.db.get_setting('yt_video_id', 'Not set')
        stream_key = manager.db.get_setting('yt_stream_key', 'Not set')
        live_chat = manager.db.get_setting('yt_live_chat_id', 'Not set')
        is_sqlite = manager.db.is_sqlite
        print("=== YouTube Studio Status ===")
        print(f"Database: {'SQLite' if is_sqlite else 'MySQL'}")
        print(f"Video ID: {video_id}")
        print(f"Stream Key: {'***' + stream_key[-4:] if len(stream_key) > 4 else stream_key}")
        print(f"Live Chat ID: {live_chat}")
        return

    if args.create_stream:
        try:
            res = manager.setup_full_stream(
                title=args.title,
                description=args.desc,
                privacy=args.privacy,
                resolution=args.resolution,
                fps=args.fps
            )
            print(json.dumps(res, indent=2))
        except Exception as e:
            print(f"[Error creating stream]: {e}", file=sys.stderr)
            sys.exit(1)
        return

    if args.poll_chat:
        manager.run_chat_daemon()
        return

    parser.print_help()


if __name__ == '__main__':
    main()
