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

// Use YouTube RTMPS (Port 443 over TLS) - bypasses cloud outbound firewall restrictions on port 1935
const RTMP_DESTINATION = getArg('rtmp-url', '') || `rtmps://a.rtmps.youtube.com/live2/${STREAM_KEY}`;

console.log(`[Streamer] Starting autonomous broadcast...`);
console.log(`[Streamer] Destination: rtmps://a.rtmps.youtube.com/live2/**** (Port 443 Secure Ingestion)`);
console.log(`[Streamer] Target URL: ${GAME_URL}`);
console.log(`[Streamer] Resolution: ${WIDTH}x${HEIGHT} @ ${FPS}fps (Bitrate: ${BITRATE})`);

// Input & Output framerate configuration
// Chrome renders at ~15fps on cloud 2-vCPU instances; FFmpeg smoothly duplicates to standard 30fps
const INPUT_FPS = Math.min(FPS, 15);
const OUTPUT_FPS = 30;

console.log(`[Streamer] Framerate: In=${INPUT_FPS}fps -> Out=${OUTPUT_FPS}fps | Bitrate: ${BITRATE}`);

// Spawn FFmpeg RTMP encoder
const ffmpegArgs = [
  '-y',
  '-thread_queue_size', '1024',
  '-fflags', 'nobuffer',
  '-flags', 'low_delay',
  '-f', 'image2pipe',
  '-vcodec', 'mjpeg',
  '-r', String(INPUT_FPS),
  '-i', 'pipe:0',
  '-f', 'lavfi',
  '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-tune', 'zerolatency',
  '-r', String(OUTPUT_FPS),
  '-pix_fmt', 'yuv420p',
  '-g', String(OUTPUT_FPS), // 1-second keyframe (enables YouTube Ultra Low Latency)
  '-b:v', BITRATE,
  '-minrate', BITRATE,
  '-maxrate', BITRATE,
  '-bufsize', String(parseInt(BITRATE, 10) * 1.2) + 'k',
  '-flush_packets', '1',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '44100',
  '-ac', '2',
  '-f', 'flv',
  '-flvflags', 'no_duration_filesize',
  RTMP_DESTINATION,
];

console.log(`[Streamer] Launching FFmpeg encoder: ffmpeg ${ffmpegArgs.join(' ')}`);
const ffmpeg = spawn('ffmpeg', ffmpegArgs);

ffmpeg.stdin.on('error', (err) => {
  // Prevent unhandled EPIPE exception if FFmpeg closes before input stream closes
  if (err.code !== 'EPIPE') {
    console.error('[FFmpeg stdin error]:', err.message);
  }
});

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

    // Detect system Chrome or Chromium if available
    const candidatePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    ].filter(Boolean);

    const executablePath = candidatePaths.find((p) => {
      try {
        return fs.existsSync(p);
      } catch (e) {
        return false;
      }
    });

    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--window-size=${WIDTH},${HEIGHT}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
      defaultViewport: { width: WIDTH, height: HEIGHT },
    };

    if (executablePath) {
      console.log(`[Streamer] Using detected system browser binary: ${executablePath}`);
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.default.launch(launchOptions);

    const page = await browser.newPage();
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });

    console.log(`[Streamer] Game canvas loaded in Headless Chromium. Starting screencast capture...`);

    const client = await page.target().createCDPSession();
    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      everyNthFrame: 1,
    });

    client.on('Page.screencastFrame', (event) => {
      // Immediately acknowledge frame so Chrome compositor does not throttle output
      client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
      try {
        const buffer = Buffer.from(event.data, 'base64');
        if (ffmpeg.stdin.writable) {
          ffmpeg.stdin.write(buffer);
        }
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
