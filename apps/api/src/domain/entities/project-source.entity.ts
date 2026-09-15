export interface ProjectSourceData {
  id: string;
  projectId: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  privacyStatus: string | null;
  metadataJson: unknown;
  analyticsJson: unknown;
  sourceStatus: string;
  mediaStatus: string;
  storageKey: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectSource {
  constructor(private readonly data: ProjectSourceData) {}

  get id(): string { return this.data.id; }
  get projectId(): string { return this.data.projectId; }
  get youtubeVideoId(): string { return this.data.youtubeVideoId; }
  get youtubeUrl(): string { return this.data.youtubeUrl; }
  get title(): string | null { return this.data.title; }
  get description(): string | null { return this.data.description; }
  get thumbnailUrl(): string | null { return this.data.thumbnailUrl; }
  get duration(): number | null { return this.data.duration; }
  get publishedAt(): string | null { return this.data.publishedAt; }
  get viewCount(): number | null { return this.data.viewCount; }
  get likeCount(): number | null { return this.data.likeCount; }
  get commentCount(): number | null { return this.data.commentCount; }
  get privacyStatus(): string | null { return this.data.privacyStatus; }
  get metadataJson(): unknown { return this.data.metadataJson; }
  get analyticsJson(): unknown { return this.data.analyticsJson; }
  get sourceStatus(): string { return this.data.sourceStatus; }
  get mediaStatus(): string { return this.data.mediaStatus; }
  get storageKey(): string | null { return this.data.storageKey; }
  get errorMessage(): string | null { return this.data.errorMessage; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }

  isMediaAvailable(): boolean { return this.data.mediaStatus === "available"; }

  toRaw(): ProjectSourceData { return { ...this.data }; }
}

export function createProjectSource(data: ProjectSourceData): ProjectSource {
  return new ProjectSource(data);
}
