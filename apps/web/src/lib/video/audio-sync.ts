export interface AudioSyncState {
  audioContext: AudioContext;
  sources: Map<number, AudioBufferSourceNode>;
  buffers: Map<number, AudioBuffer>;
  isPlaying: boolean;
  startTime: number;
  startContextTime: number;
}

export class AudioSyncService {
  private state: AudioSyncState;
  private musicGain: GainNode | null = null;
  private originalGain: GainNode | null = null;
  private masterGain: GainNode;

  constructor() {
    this.state = {
      audioContext: new AudioContext({ sampleRate: 44100 }),
      sources: new Map(),
      buffers: new Map(),
      isPlaying: false,
      startTime: 0,
      startContextTime: 0,
    };

    this.masterGain = this.state.audioContext.createGain();
    this.masterGain.connect(this.state.audioContext.destination);
  }

  async decodeAudioData(audioData: AudioData): Promise<AudioBuffer> {
    const numFrames = audioData.numberOfFrames;
    const numChannels = audioData.numberOfChannels;
    const sampleRate = audioData.sampleRate;

    const buffer = this.state.audioContext.createBuffer(
      numChannels,
      numFrames,
      sampleRate
    );

    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = new Float32Array(numFrames);
      audioData.copyTo(channelData, { planeIndex: ch });
      buffer.getChannelData(ch).set(channelData);
    }

    return buffer;
  }

  async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.state.audioContext.decodeAudioData(arrayBuffer);
  }

  playOriginalAudio(audioData: AudioData, volume = 1): void {
    this.decodeAudioData(audioData).then((buffer) => {
      const source = this.state.audioContext.createBufferSource();
      source.buffer = buffer;

      if (!this.originalGain) {
        this.originalGain = this.state.audioContext.createGain();
        this.originalGain.connect(this.masterGain);
      }
      this.originalGain.gain.value = volume;

      source.connect(this.originalGain);
      source.start();
      this.state.sources.set(Date.now(), source);
      source.onended = () => {
        this.state.sources.delete(Date.now());
      };
    }).catch(() => {});
  }

  playMusicTrack(buffer: AudioBuffer, volume = 0.3, fadeIn = 0, fadeOut = 0): void {
    this.stopMusic();

    if (this.state.audioContext.state === "suspended") {
      this.state.audioContext.resume();
    }

    const source = this.state.audioContext.createBufferSource();
    source.buffer = buffer;

    this.musicGain = this.state.audioContext.createGain();
    this.musicGain.gain.value = 0;

    if (fadeIn > 0) {
      this.musicGain.gain.setValueAtTime(0, this.state.audioContext.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        volume,
        this.state.audioContext.currentTime + fadeIn
      );
    } else {
      this.musicGain.gain.value = volume;
    }

    if (fadeOut > 0) {
      const duration = buffer.duration;
      this.musicGain.gain.setValueAtTime(
        volume,
        this.state.audioContext.currentTime + duration - fadeOut
      );
      this.musicGain.gain.linearRampToValueAtTime(
        0,
        this.state.audioContext.currentTime + duration
      );
    }

    source.connect(this.musicGain);
    this.musicGain.connect(this.masterGain);
    source.start();

    this.state.sources.set(Date.now(), source);
    source.onended = () => {
      this.stopMusic();
    };
  }

  stopMusic(): void {
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
    for (const source of this.state.sources.values()) {
      try {
        source.stop();
      } catch {}
    }
    this.state.sources.clear();
  }

  getCurrentTime(): number {
    if (!this.state.isPlaying) return this.state.startTime;
    return (
      this.state.startTime +
      (this.state.audioContext.currentTime - this.state.startContextTime) *
        1000
    );
  }

  start(): void {
    this.state.isPlaying = true;
    this.state.startContextTime = this.state.audioContext.currentTime;
  }

  stop(): void {
    this.state.isPlaying = false;
    this.state.startTime = this.getCurrentTime();
  }

  seekTo(timeMs: number): void {
    this.state.startTime = timeMs;
    this.state.startContextTime = this.state.audioContext.currentTime;
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  getAudioContext(): AudioContext {
    return this.state.audioContext;
  }

  destroy(): void {
    this.stopMusic();
    if (this.originalGain) {
      this.originalGain.disconnect();
      this.originalGain = null;
    }
    this.masterGain.disconnect();
    this.state.buffers.clear();
    this.state.audioContext.close();
  }
}
