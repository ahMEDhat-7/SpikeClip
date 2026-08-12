import type { Project, MediaLibrary, Timeline, Track, Clip, Subtitle, Effect, Transform } from "@openreel/core";
import type { Job } from "@/domain/entities/job";

export interface CaptionEntry {
  text: string;
  startTime: number;
  endTime: number;
}

export interface BuildProjectInput {
  job: Job;
  segment: { start: number; end: number };
  videoBlob: Blob;
  captions?: CaptionEntry[];
  musicBlob?: Blob;
  musicMetadata?: { duration: number; sampleRate: number; channels: number };
  width?: number;
  height?: number;
}

export function buildProjectFromJob(input: BuildProjectInput): Project {
  const {
    job,
    segment,
    videoBlob,
    captions,
    musicBlob,
    musicMetadata,
    width = 1080,
    height = 1920,
  } = input;

  const projectId = crypto.randomUUID();
  const videoMediaId = crypto.randomUUID();
  const videoTrackId = crypto.randomUUID();
  const videoClipId = crypto.randomUUID();

  const duration = segment.end - segment.start;

  const mediaLibrary = buildMediaLibrary(
    videoMediaId,
    videoBlob,
    job,
    musicBlob,
    musicMetadata,
  );

  const timeline = buildTimeline(
    videoTrackId,
    videoClipId,
    videoMediaId,
    segment,
    duration,
    captions,
    musicBlob,
  );

  const now = Date.now();

  return {
    id: projectId,
    name: job.videoTitle ?? `Clip — ${job.id}`,
    createdAt: now,
    modifiedAt: now,
    settings: {
      width,
      height,
      frameRate: 30,
      sampleRate: 44100,
      channels: 2,
    },
    mediaLibrary,
    timeline,
  };
}

function buildMediaLibrary(
  videoMediaId: string,
  videoBlob: Blob,
  job: Job,
  musicBlob?: Blob,
  musicMetadata?: { duration: number; sampleRate: number; channels: number },
): MediaLibrary {
  const items: MediaLibrary["items"] = [
    {
      id: videoMediaId,
      name: job.videoTitle ?? "source.mp4",
      type: "video",
      fileHandle: null,
      blob: videoBlob,
      metadata: {
        duration: job.videoDuration ?? 0,
        width: 1920,
        height: 1080,
        frameRate: 30,
        codec: "h264",
        sampleRate: 44100,
        channels: 2,
        fileSize: videoBlob.size,
      },
      thumbnailUrl: job.videoThumbnail ?? null,
      waveformData: null,
      originalUrl: job.url,
    },
  ];

  if (musicBlob && musicMetadata) {
    items.push({
      id: crypto.randomUUID(),
      name: "music",
      type: "audio",
      fileHandle: null,
      blob: musicBlob,
      metadata: {
        duration: musicMetadata.duration,
        width: 0,
        height: 0,
        frameRate: 0,
        codec: "aac",
        sampleRate: musicMetadata.sampleRate,
        channels: musicMetadata.channels,
        fileSize: musicBlob.size,
      },
      thumbnailUrl: null,
      waveformData: null,
    });
  }

  return { items };
}

function buildTimeline(
  videoTrackId: string,
  videoClipId: string,
  videoMediaId: string,
  segment: { start: number; end: number },
  duration: number,
  captions?: CaptionEntry[],
  musicBlob?: Blob,
): Timeline {
  const videoClip: Clip = {
    id: videoClipId,
    mediaId: videoMediaId,
    trackId: videoTrackId,
    startTime: 0,
    duration,
    inPoint: segment.start,
    outPoint: segment.end,
    effects: [],
    audioEffects: [],
    transform: defaultTransform(),
    volume: 1,
    keyframes: [],
  };

  const tracks: Track[] = [
    {
      id: videoTrackId,
      type: "video",
      name: "Main",
      clips: [videoClip],
      transitions: [],
      locked: false,
      hidden: false,
      muted: false,
      solo: false,
    },
  ];

  if (musicBlob) {
    const musicTrackId = crypto.randomUUID();
    const musicClipId = crypto.randomUUID();
    tracks.push({
      id: musicTrackId,
      type: "audio",
      name: "Music",
      clips: [
        {
          id: musicClipId,
          mediaId: crypto.randomUUID(),
          trackId: musicTrackId,
          startTime: 0,
          duration,
          inPoint: 0,
          outPoint: duration,
          effects: [],
          audioEffects: [],
          transform: defaultTransform(),
          volume: 0.5,
          keyframes: [],
        },
      ],
      transitions: [],
      locked: false,
      hidden: false,
      muted: false,
      solo: false,
    });
  }

  const subtitles = buildSubtitles(captions, segment.start);

  return {
    tracks,
    subtitles,
    duration,
    markers: [],
  };
}

function buildSubtitles(
  captions?: CaptionEntry[],
  segmentStart = 0,
): Subtitle[] {
  if (!captions || captions.length === 0) return [];

  return captions.map((cap) => ({
    id: crypto.randomUUID(),
    text: cap.text,
    startTime: cap.startTime - segmentStart,
    endTime: cap.endTime - segmentStart,
    style: {
      fontFamily: "Inter",
      fontSize: 48,
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.7)",
      position: "bottom" as const,
    },
    animationStyle: "word-highlight" as const,
  }));
}

function defaultTransform(): Transform {
  return {
    position: { x: 0.5, y: 0.5 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 },
    opacity: 1,
    fitMode: "contain",
  };
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project);
}

export function deserializeProject(json: string): Project {
  return JSON.parse(json) as Project;
}
