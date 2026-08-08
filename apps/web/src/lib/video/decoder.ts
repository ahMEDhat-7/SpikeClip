export interface DecodedFrame {
  video: VideoFrame;
  audio: AudioData | null;
  timestamp: number;
}

export type PlaybackState = "idle" | "playing" | "paused" | "seeking";

export class VideoDecoderService {
  private videoDecoder: VideoDecoder | null = null;
  private audioDecoder: AudioDecoder | null = null;
  private videoChunks: Array<{ chunk: EncodedVideoChunk; timestamp: number; duration: number; type?: "key" | "delta" }> = [];
  private audioChunks: Array<{ chunk: EncodedAudioChunk; timestamp: number; duration: number; type?: "key" | "delta" }> = [];
  private videoConfig: VideoDecoderConfig | null = null;
  private audioConfig: AudioDecoderConfig | null = null;
  private frameBuffer: Map<number, VideoFrame> = new Map();
  private audioBuffer: Map<number, AudioData> = new Map();
  private state: PlaybackState = "idle";
  private speed = 1;
  private startTimestamp = 0;
  private endTimestamp = Infinity;
  private currentDecodeIndex = 0;
  private currentAudioDecodeIndex = 0;
  private onFrame: ((frame: VideoFrame) => void) | null = null;
  private onAudioData: ((data: AudioData) => void) | null = null;
  private onError: ((err: Error) => void) | null = null;
  private decoding = false;
  private maxBufferSize = 60;

  async initialize(
    videoChunks: Array<{ chunk: EncodedVideoChunk; timestamp: number; duration: number; type?: "key" | "delta" }>,
    audioChunks: Array<{ chunk: EncodedAudioChunk; timestamp: number; duration: number; type?: "key" | "delta" }>,
    videoConfig: VideoDecoderConfig,
    audioConfig: AudioDecoderConfig
  ): Promise<void> {
    this.destroy();
    this.videoChunks = videoChunks;
    this.audioChunks = audioChunks;
    this.videoConfig = videoConfig;
    this.audioConfig = audioConfig;
    this.currentDecodeIndex = 0;
    this.currentAudioDecodeIndex = 0;

    const videoSupported = await VideoDecoder.isConfigSupported(videoConfig);
    if (!videoSupported.supported) {
      throw new Error(`Video codec not supported: ${videoConfig.codec}`);
    }

    this.videoDecoder = new VideoDecoder({
      output: (frame) => {
        this.frameBuffer.set(frame.timestamp, frame);
        this.onFrame?.(frame);
      },
      error: (e) => {
        this.onError?.(new Error(`Video decoder error: ${e.message}`));
      },
    });

    this.videoDecoder.configure(videoConfig);

    if (audioConfig) {
      const audioSupported = await AudioDecoder.isConfigSupported(audioConfig);
      if (audioSupported.supported) {
        this.audioDecoder = new AudioDecoder({
          output: (data) => {
            this.audioBuffer.set(data.timestamp, data);
            this.onAudioData?.(data);
          },
          error: (e) => {
            this.onError?.(new Error(`Audio decoder error: ${e.message}`));
          },
        });
        this.audioDecoder.configure(audioConfig);
      }
    }
  }

  setRange(startMs: number, endMs: number): void {
    this.startTimestamp = startMs * 1000;
    this.endTimestamp = endMs * 1000;
    this.seekTo(startMs);
  }

  setSpeed(rate: number): void {
    this.speed = Math.max(0.25, Math.min(4, rate));
  }

  onFrameCallback(cb: (frame: VideoFrame) => void): void {
    this.onFrame = cb;
  }

  onAudioCallback(cb: (data: AudioData) => void): void {
    this.onAudioData = cb;
  }

  onErrorCallback(cb: (err: Error) => void): void {
    this.onError = cb;
  }

  async seekTo(timeMs: number): Promise<void> {
    const timeUs = timeMs * 1000;
    if (this.videoDecoder && this.videoDecoder.state === "configured") {
      await this.videoDecoder.flush();
    }
    if (this.audioDecoder && this.audioDecoder.state === "configured") {
      await this.audioDecoder.flush();
    }

    this.frameBuffer.clear();
    this.audioBuffer.clear();

    let found = false;
    for (let i = 0; i < this.videoChunks.length; i++) {
      const c = this.videoChunks[i];
      if (c.timestamp >= timeUs && c.type === "key") {
        this.currentDecodeIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      for (let i = this.videoChunks.length - 1; i >= 0; i--) {
        if (this.videoChunks[i].type === "key") {
          this.currentDecodeIndex = i;
          found = true;
          break;
        }
      }
    }

    for (let i = 0; i < this.audioChunks.length; i++) {
      if (this.audioChunks[i].timestamp >= timeUs) {
        this.currentAudioDecodeIndex = i;
        break;
      }
    }
  }

  async decodeNextBatch(count = 5): Promise<VideoFrame[]> {
    if (!this.videoDecoder || this.videoDecoder.state !== "configured") return [];
    if (this.currentDecodeIndex >= this.videoChunks.length) return [];

    const frames: VideoFrame[] = [];
    const end = Math.min(this.currentDecodeIndex + count, this.videoChunks.length);

    for (let i = this.currentDecodeIndex; i < end; i++) {
      const { chunk, timestamp } = this.videoChunks[i];
      if (timestamp < this.startTimestamp) continue;
      if (timestamp > this.endTimestamp) break;

      try {
        this.videoDecoder.decode(chunk);
      } catch {
        continue;
      }
    }

    this.currentDecodeIndex = end;

    await new Promise((r) => setTimeout(r, 0));

    const sorted = Array.from(this.frameBuffer.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, this.maxBufferSize);

    for (const [ts, frame] of sorted) {
      if (ts >= this.startTimestamp && ts <= this.endTimestamp) {
        frames.push(frame);
      }
    }

    return frames;
  }

  async decodeNextAudioBatch(count = 10): Promise<AudioData[]> {
    if (!this.audioDecoder || this.audioDecoder.state !== "configured") return [];
    if (this.currentAudioDecodeIndex >= this.audioChunks.length) return [];

    const end = Math.min(this.currentAudioDecodeIndex + count, this.audioChunks.length);

    for (let i = this.currentAudioDecodeIndex; i < end; i++) {
      const { chunk } = this.audioChunks[i];
      try {
        this.audioDecoder.decode(chunk);
      } catch {
        continue;
      }
    }

    this.currentAudioDecodeIndex = end;
    return Array.from(this.audioBuffer.values());
  }

  isAtEnd(): boolean {
    return this.currentDecodeIndex >= this.videoChunks.length;
  }

  getDurationMs(): number {
    if (this.videoChunks.length === 0) return 0;
    const last = this.videoChunks[this.videoChunks.length - 1];
    return (last.timestamp + last.duration) / 1000;
  }

  getCurrentTime(): number {
    if (this.videoChunks.length === 0) return 0;
    const idx = Math.min(this.currentDecodeIndex, this.videoChunks.length - 1);
    return this.videoChunks[idx].timestamp / 1000;
  }

  destroy(): void {
    if (this.videoDecoder && this.videoDecoder.state !== "closed") {
      this.videoDecoder.close();
    }
    if (this.audioDecoder && this.audioDecoder.state !== "closed") {
      this.audioDecoder.close();
    }
    this.videoDecoder = null;
    this.audioDecoder = null;

    for (const frame of this.frameBuffer.values()) {
      frame.close();
    }
    this.frameBuffer.clear();

    for (const data of this.audioBuffer.values()) {
      data.close();
    }
    this.audioBuffer.clear();
  }
}
