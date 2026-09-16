export interface YouTubeMessage {
  id: string;
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  text: string;
  timestamp: number;
}

export type YouTubeMessageCallback = (msg: YouTubeMessage) => void;
export type YouTubeStatusCallback = (connected: boolean, streamTitle?: string, error?: string) => void;

export class YouTubePoller {
  private apiKey: string = '';
  private videoId: string = '';
  private liveChatId: string | null = null;
  private nextPageToken: string | null = null;
  private isPolling: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private streamTitle: string = '';

  private messageCallbacks: YouTubeMessageCallback[] = [];
  private statusCallbacks: YouTubeStatusCallback[] = [];

  constructor(apiKey?: string, videoId?: string) {
    if (apiKey) this.apiKey = apiKey.trim();
    if (videoId) this.videoId = videoId.trim();
  }

  public setCredentials(apiKey: string, videoId: string): void {
    this.apiKey = apiKey.trim();
    this.videoId = videoId.trim();
    this.liveChatId = null;
    this.nextPageToken = null;
  }

  public onMessage(callback: YouTubeMessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  public onStatus(callback: YouTubeStatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatus(connected: boolean, error?: string): void {
    for (const cb of this.statusCallbacks) {
      cb(connected, this.streamTitle, error);
    }
  }

  public async start(): Promise<void> {
    if (this.isPolling) return;
    if (!this.apiKey || !this.videoId) {
      this.notifyStatus(false, 'Missing API Key or Video ID');
      return;
    }

    this.isPolling = true;
    try {
      await this.resolveLiveChatId();
      this.pollCycle();
    } catch (err: any) {
      this.notifyStatus(false, err?.message || 'Failed to initialize YouTube stream');
      this.isPolling = false;
    }
  }

  public stop(): void {
    this.isPolling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.notifyStatus(false);
  }

  public isRunning(): boolean {
    return this.isPolling;
  }

  public getStreamTitle(): string {
    return this.streamTitle;
  }

  private async resolveLiveChatId(): Promise<void> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${encodeURIComponent(this.videoId)}&key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`YouTube API Error: ${res.status} ${res.statusText} - ${errBody}`);
    }

    const data: any = await res.json();
    if (!data.items || data.items.length === 0) {
      throw new Error(`Video with ID "${this.videoId}" not found.`);
    }

    const videoItem = data.items[0];
    this.streamTitle = videoItem.snippet?.title || 'YouTube Live Stream';

    const liveChatId = videoItem.liveStreamingDetails?.activeLiveChatId;
    if (!liveChatId) {
      throw new Error('Video has no active Live Chat. Is the stream live?');
    }

    this.liveChatId = liveChatId;
    this.notifyStatus(true);
  }

  private async pollCycle(): Promise<void> {
    if (!this.isPolling || !this.liveChatId) return;

    let delayMs = 2500; // Default fallback delay

    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${encodeURIComponent(this.liveChatId)}&part=snippet,authorDetails&key=${encodeURIComponent(this.apiKey)}`;
      if (this.nextPageToken) {
        url += `&pageToken=${encodeURIComponent(this.nextPageToken)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Chat Polling failed with status ${res.status}`);
      }

      const data: any = await res.json();
      if (data.pollingIntervalMillis) {
        delayMs = Math.max(1000, data.pollingIntervalMillis);
      }
      this.nextPageToken = data.nextPageToken || null;

      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const text = item.snippet?.displayMessage || item.snippet?.textMessageDetails?.messageText || '';
          const authorName = item.authorDetails?.displayName || 'Viewer';
          const authorId = item.authorDetails?.channelId || authorName;
          const authorAvatar = item.authorDetails?.profileImageUrl;

          const msg: YouTubeMessage = {
            id: item.id,
            authorName,
            authorId,
            authorAvatar,
            text,
            timestamp: new Date(item.snippet?.publishedAt || Date.now()).getTime(),
          };

          for (const cb of this.messageCallbacks) {
            cb(msg);
          }
        }
      }

      this.notifyStatus(true);
    } catch (err: any) {
      console.error('[YouTubePoller error]:', err?.message);
      this.notifyStatus(false, err?.message);
      delayMs = 5000; // Backoff on error
    }

    if (this.isPolling) {
      this.timer = setTimeout(() => this.pollCycle(), delayMs);
    }
  }
}
