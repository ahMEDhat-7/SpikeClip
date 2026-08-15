import { createFile } from "mp4box";

export interface DemuxedChunk {
  chunk: EncodedVideoChunk;
  type: "key" | "delta";
  timestamp: number;
  duration: number;
}

export interface DemuxedAudioChunk {
  chunk: EncodedAudioChunk;
  timestamp: number;
  duration: number;
}

export interface DemuxResult {
  videoChunks: DemuxedChunk[];
  audioChunks: DemuxedAudioChunk[];
  videoConfig: VideoDecoderConfig;
  audioConfig: AudioDecoderConfig;
  duration: number;
}

export async function demuxVideo(url: string): Promise<DemuxResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Failed to read video response body");
  const mp4 = createFile();

  const videoChunks: DemuxedChunk[] = [];
  const audioChunks: DemuxedAudioChunk[] = [];
  let videoConfig: VideoDecoderConfig | null = null;
  let audioConfig: AudioDecoderConfig | null = null;
  let duration = 0;

  return new Promise<DemuxResult>((resolve, reject) => {
    let offset = 0;
    let videoTrackId: number | null = null;
    let audioTrackId: number | null = null;

    (mp4 as any).onReady = (info: any) => {
      duration = info.duration / 1000;

      const videoTrack = info.videoTracks?.[0];
      if (videoTrack) {
        videoTrackId = videoTrack.id;
        const codecPrivate = videoTrack.codec_private;
        const description = codecPrivate
          ? new Uint8Array(codecPrivate)
          : undefined;

        videoConfig = {
          codec: videoTrack.codec,
          codedWidth: videoTrack.track_width,
          codedHeight: videoTrack.track_height,
          description: description as BufferSource | undefined,
          optimizeForLatency: true,
        };
      }

      const audioTrack = info.audioTracks?.[0];
      if (audioTrack) {
        audioTrackId = audioTrack.id;
        const codecPrivate = audioTrack.codec_private;
        const description = codecPrivate
          ? new Uint8Array(codecPrivate)
          : undefined;

        audioConfig = {
          codec: audioTrack.codec,
          sampleRate: audioTrack.sample_rate,
          numberOfChannels: audioTrack.channel_count,
          description: description as BufferSource | undefined,
        };
      }

      const trackIds = [videoTrackId, audioTrackId].filter(
        (id): id is number => id !== null
      );
      (mp4 as any).setExtractionOptions(trackIds);
    };

    (mp4 as any).onSamples = (trackId: number, _user: any, samples: any[]) => {
      for (const sample of samples) {
        const data = new Uint8Array(sample.data);

        if (trackId === videoTrackId) {
          const chunk = new EncodedVideoChunk({
            type: sample.is_sync ? "key" : "delta",
            timestamp: sample.cts,
            duration: sample.duration,
            data,
          });
          videoChunks.push({
            chunk,
            type: sample.is_sync ? "key" : "delta",
            timestamp: sample.cts,
            duration: sample.duration,
          });
        } else if (trackId === audioTrackId) {
          const chunk = new EncodedAudioChunk({
            type: sample.is_sync ? "key" : "delta",
            timestamp: sample.cts,
            duration: sample.duration,
            data,
          });
          audioChunks.push({
            chunk,
            timestamp: sample.cts,
            duration: sample.duration,
          });
        }
      }
    };

    (mp4 as any).onFlush = () => {
      if (!videoConfig) {
        reject(new Error("No video track found"));
        return;
      }
      if (!audioConfig) {
        audioConfig = {
          codec: "mp4a.40.2",
          sampleRate: 44100,
          numberOfChannels: 2,
          description: undefined,
        };
      }
      resolve({
        videoChunks,
        audioChunks,
        videoConfig,
        audioConfig,
        duration,
      });
    };

    (mp4 as any).onError = (err: string) => {
      reject(new Error(`MP4 demux error: ${err}`));
    };

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const buffer = value.buffer as any;
          buffer.fileStart = offset;
          offset += value.length;
          (mp4 as any).appendBuffer(buffer);
        }
        (mp4 as any).flush();
      } catch (err) {
        reject(err);
      }
    })();
  });
}
