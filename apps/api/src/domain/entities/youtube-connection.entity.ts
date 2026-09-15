export interface YoutubeConnectionData {
  id: string;
  userId: string;
  channelId: string;
  channelTitle: string | null;
  channelThumbnail: string | null;
  provider: string;
  status: string;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class YoutubeConnection {
  constructor(private readonly data: YoutubeConnectionData) {}

  get id(): string { return this.data.id; }
  get userId(): string { return this.data.userId; }
  get channelId(): string { return this.data.channelId; }
  get channelTitle(): string | null { return this.data.channelTitle; }
  get channelThumbnail(): string | null { return this.data.channelThumbnail; }
  get provider(): string { return this.data.provider; }
  get status(): string { return this.data.status; }
  get lastSyncedAt(): Date | null { return this.data.lastSyncedAt; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }

  isActive(): boolean { return this.data.status === "active"; }

  markSynced(): YoutubeConnectionData {
    return { ...this.data, lastSyncedAt: new Date(), updatedAt: new Date() };
  }

  toRaw(): YoutubeConnectionData { return { ...this.data }; }
}

export function createYoutubeConnection(data: YoutubeConnectionData): YoutubeConnection {
  return new YoutubeConnection(data);
}
