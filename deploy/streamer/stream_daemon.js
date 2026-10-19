#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : defaultVal;
}

const STREAM_KEY = getArg('stream-key', process.env.YOUTUBE_STREAM_KEY || '');
const GAME_URL = getArg('url', 'http://localhost/game/index.html?stream=1');
const RESOLUTION = getArg('resolution', '1920x1080');
const FPS = parseInt(getArg('fps', '30'), 10);
const BITRATE = getArg('bitrate', '4500k');

const [WIDTH, HEIGHT] = RESOLUTION.split('x').map((n) => parseInt(n, 10));

if (!STREAM_KEY) {
  console.error('[Streamer Error] No YouTube Stream Key provided via --stream-key');
  process.exit(1);
}

const RTMP_DESTINATION = `rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}`;

console.log(`[Streamer] Starting autonomous broadcast...`);
console.log(`[Streamer] Destination: rtmp://a.rtmp.youtube.com/live2/****`);
console.log(`[Streamer] Target URL: ${GAME_URL}`);
console.log(`[Streamer] Resolution: ${WIDTH}x${HEIGHT} @ ${FPS}fps (Bitrate: ${BITRATE})`);

// Spawn FFmpeg RTMP encoder
const ffmpegArgs = [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'png',
  '-r', String(FPS),
  '-i', 'pipe:0',
  '-f', 'lavfi',
  '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-b:v', BITRATE,
  '-maxrate', String(parseInt(BITRATE, 10) * 1.2) + 'k',
  '-bufsize', String(parseInt(BITRATE, 10) * 2) + 'k',
  '-pix_fmt', 'yuv420p',
  '-g', String(FPS * 2),
  '-c:a', 'aac',
  '-b:a', '128k',
  '-f', 'flv',
  RTMP_DESTINATION,
];

console.log(`[Streamer] Launching FFmpeg encoder: ffmpeg ${ffmpegArgs.join(' ')}`);
const ffmpeg = spawn('ffmpeg', ffmpegArgs);

ffmpeg.stdout.on('data', (d) => process.stdout.write(`[FFmpeg] ${d}`));
ffmpeg.stderr.on('data', (d) => process.stderr.write(`[FFmpeg] ${d}`));
ffmpeg.on('close', (code) => {
  console.log(`[Streamer] FFmpeg exited with code ${code}`);
  cleanup();
});

let browser = null;

async function launchBrowserStreamer() {
  try {
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        `--window-size=${WIDTH},${HEIGHT}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
      defaultViewport: { width: WIDTH, height: HEIGHT },
    });

    const page = await browser.newPage();
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });

    console.log(`[Streamer] Game canvas loaded in Headless Chromium. Starting screencast capture...`);

    const client = await page.target().createCDPSession();
    await client.send('Page.startScreencast', {
      format: 'png',
      everyNthFrame: 1,
    });

    client.on('Page.screencastFrame', async (event) => {
      try {
        const buffer = Buffer.from(event.data, 'base64');
        if (ffmpeg.stdin.writable) {
          ffmpeg.stdin.write(buffer);
        }
        await client.send('Page.screencastFrameAck', { sessionId: event.sessionId });
      } catch (e) {
        // stream closing or pipe full
      }
    });
  } catch (err) {
    console.error('[Streamer Error] Failed to initialize headless browser:', err.message);
    cleanup();
  }
}

function cleanup() {
  console.log('[Streamer] Tearing down streamer processes...');
  try {
    if (browser) browser.close();
  } catch (e) {}
  try {
    if (ffmpeg && !ffmpeg.killed) ffmpeg.kill('SIGTERM');
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

launchBrowserStreamer();
