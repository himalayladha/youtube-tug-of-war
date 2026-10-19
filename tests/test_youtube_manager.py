"""
Unit and Integration Tests for YouTube Data API v3 Studio & Live Poller Daemon
"""

import os
import sys
import unittest
import sqlite3
import tempfile
from unittest.mock import MagicMock, patch

# Ensure backend module is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.youtube_manager import YouTubeManager, DatabaseHelper


class TestYouTubeManager(unittest.TestCase):
    def setUp(self):
        # Create an in-memory or temporary SQLite database for testing
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix='.sqlite')
        self.conn = sqlite3.connect(self.temp_db_path)
        self.conn.execute("""
            CREATE TABLE settings (
                setting_key VARCHAR(64) PRIMARY KEY,
                setting_value TEXT
            );
        """)
        self.conn.execute("""
            CREATE TABLE chat_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name VARCHAR(100),
                raw_text TEXT,
                team VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.execute("""
            CREATE TABLE leaderboard (
                user_id VARCHAR(128) PRIMARY KEY,
                user_name VARCHAR(100),
                team VARCHAR(20),
                total_votes INT DEFAULT 0,
                score INT DEFAULT 0,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.commit()

        # Database helper pointing to temp SQLite
        self.db = DatabaseHelper(config={
            'db_driver': 'sqlite',
            'db_path': self.temp_db_path
        })
        self.manager = YouTubeManager(db=self.db)

    def tearDown(self):
        self.conn.close()
        try:
            os.close(self.temp_db_fd)
            os.remove(self.temp_db_path)
        except OSError:
            pass

    def test_parse_vote_black_team(self):
        """Validates all command variations for Team Black"""
        cases = ['1', ' 1 ', 'black', 'BLACK', 'Black!', 'with', 'WITH ANDROID', 'lane1', 'left']
        for text in cases:
            with self.subTest(text=text):
                self.assertEqual(YouTubeManager.parse_vote(text), 'BLACK')

    def test_parse_vote_white_team(self):
        """Validates all command variations for Team White"""
        cases = ['2', ' 2 ', 'white', 'WHITE', 'White!!', 'against', 'AGAINST IPHONE', 'lane2', 'right']
        for text in cases:
            with self.subTest(text=text):
                self.assertEqual(YouTubeManager.parse_vote(text), 'WHITE')

    def test_parse_vote_ignored(self):
        """Validates spam and non-vote messages are properly ignored"""
        cases = ['hello world', 'gg', 'who won?', 'sub to my channel', 'super chat!', '1234', '']
        for text in cases:
            with self.subTest(text=text):
                self.assertIsNone(YouTubeManager.parse_vote(text))

    def test_record_vote_and_leaderboard_scoring(self):
        """Verifies votes increment score and update leaderboard accurately"""
        # User A votes Black twice
        self.manager.record_vote('user-1', 'GamerX', 'BLACK', '1')
        self.manager.record_vote('user-1', 'GamerX', 'BLACK', 'black')

        # User B votes White once
        self.manager.record_vote('user-2', 'PixelQueen', 'WHITE', '2')

        # Check chat_logs count
        logs = self.db.fetchall("SELECT * FROM chat_logs")
        self.assertEqual(len(logs), 3)

        # Check leaderboard
        lead_black = self.db.fetchone("SELECT score, total_votes FROM leaderboard WHERE user_id = 'user-1'")
        self.assertEqual(lead_black['score'], 20)
        self.assertEqual(lead_black['total_votes'], 2)

        lead_white = self.db.fetchone("SELECT score, total_votes FROM leaderboard WHERE user_id = 'user-2'")
        self.assertEqual(lead_white['score'], 10)
        self.assertEqual(lead_white['total_votes'], 1)

    def test_setup_full_stream_mocked(self):
        """Verifies broadcast creation, stream creation, and database settings binding"""
        mock_service = MagicMock()
        mock_service.liveBroadcasts().insert().execute.return_value = {
            'id': 'mock-video-123',
            'snippet': {'liveChatId': 'mock-chat-456'}
        }
        mock_service.liveStreams().insert().execute.return_value = {
            'id': 'mock-stream-789',
            'cdn': {
                'ingestionInfo': {
                    'ingestionAddress': 'rtmp://a.rtmp.youtube.com/live2',
                    'streamName': 'test-stream-key-xyz'
                }
            }
        }
        mock_service.liveBroadcasts().bind().execute.return_value = {
            'id': 'mock-video-123',
            'snippet': {'liveChatId': 'mock-chat-456'}
        }

        with patch.object(self.manager, 'get_service', return_value=mock_service):
            res = self.manager.setup_full_stream(
                title="Test Tournament",
                privacy="unlisted",
                resolution="1080p",
                fps="60fps"
            )

            self.assertTrue(res['success'])
            self.assertEqual(res['video_id'], 'mock-video-123')
            self.assertEqual(res['stream_key'], 'test-stream-key-xyz')
            self.assertEqual(res['live_chat_id'], 'mock-chat-456')

            # Verify saved into DB
            self.assertEqual(self.db.get_setting('yt_video_id'), 'mock-video-123')
            self.assertEqual(self.db.get_setting('yt_stream_key'), 'test-stream-key-xyz')
            self.assertEqual(self.db.get_setting('yt_live_chat_id'), 'mock-chat-456')

    def test_poll_chat_step_mocked(self):
        """Verifies chat message ingestion and vote tracking"""
        mock_service = MagicMock()
        mock_service.liveChatMessages().list().execute.return_value = {
            'nextPageToken': 'next-token-abc',
            'pollingIntervalMillis': 2000,
            'items': [
                {
                    'snippet': {'displayMessage': '1'},
                    'authorDetails': {'displayName': 'Alpha', 'channelId': 'chan-1'}
                },
                {
                    'snippet': {'displayMessage': 'white'},
                    'authorDetails': {'displayName': 'Beta', 'channelId': 'chan-2'}
                },
                {
                    'snippet': {'displayMessage': 'spam message'},
                    'authorDetails': {'displayName': 'Spammer', 'channelId': 'chan-3'}
                }
            ]
        }

        with patch.object(self.manager, 'get_service', return_value=mock_service):
            res = self.manager.poll_chat_step('mock-chat-456')
            self.assertEqual(res['next_page_token'], 'next-token-abc')
            self.assertEqual(res['votes_count'], 2) # Alpha (1) and Beta (white)
            self.assertEqual(res['messages_count'], 3)


if __name__ == '__main__':
    unittest.main()
