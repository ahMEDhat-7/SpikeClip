export interface ProjectSceneData {
  id: string;
  projectId: string;
  sourceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number | null;
  rank: number | null;
  analysisJson: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectScene {
  constructor(private readonly data: ProjectSceneData) {}

  get id(): string { return this.data.id; }
  get projectId(): string { return this.data.projectId; }
  get sourceId(): string { return this.data.sourceId; }
  get startTime(): number { return this.data.startTime; }
  get endTime(): number { return this.data.endTime; }
  get duration(): number { return this.data.duration; }
  get score(): number | null { return this.data.score; }
  get rank(): number | null { return this.data.rank; }
  get analysisJson(): unknown { return this.data.analysisJson; }
  get status(): string { return this.data.status; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }

  isSelected(): boolean { return this.data.status === "selected"; }

  toRaw(): ProjectSceneData { return { ...this.data }; }
}

export function createProjectScene(data: ProjectSceneData): ProjectScene {
  return new ProjectScene(data);
}
