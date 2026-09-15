export interface GeneratedClipData {
  id: string;
  projectId: string;
  sceneId: string;
  sourceId: string;
  status: string;
  platform: string | null;
  aspectRatio: string | null;
  duration: number | null;
  editorConfigJson: unknown;
  outputStorageKey: string | null;
  fileUrl: string | null;
  size: number | null;
  progress: number;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export class GeneratedClip {
  constructor(private readonly data: GeneratedClipData) {}

  get id(): string { return this.data.id; }
  get projectId(): string { return this.data.projectId; }
  get sceneId(): string { return this.data.sceneId; }
  get sourceId(): string { return this.data.sourceId; }
  get status(): string { return this.data.status; }
  get platform(): string | null { return this.data.platform; }
  get aspectRatio(): string | null { return this.data.aspectRatio; }
  get duration(): number | null { return this.data.duration; }
  get editorConfigJson(): unknown { return this.data.editorConfigJson; }
  get outputStorageKey(): string | null { return this.data.outputStorageKey; }
  get fileUrl(): string | null { return this.data.fileUrl; }
  get size(): number | null { return this.data.size; }
  get progress(): number { return this.data.progress; }
  get errorMessage(): string | null { return this.data.errorMessage; }
  get createdAt(): Date { return this.data.createdAt; }
  get startedAt(): Date | null { return this.data.startedAt; }
  get completedAt(): Date | null { return this.data.completedAt; }

  isCompleted(): boolean { return this.data.status === "completed"; }
  isFailed(): boolean { return this.data.status === "failed"; }

  toRaw(): GeneratedClipData { return { ...this.data }; }
}

export function createGeneratedClip(data: GeneratedClipData): GeneratedClip {
  return new GeneratedClip(data);
}
