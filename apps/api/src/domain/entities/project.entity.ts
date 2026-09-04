export interface ProjectData {
  id: string;
  userId: string;
  youtubeConnectionId: string | null;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Project {
  constructor(private readonly data: ProjectData) {}

  get id(): string { return this.data.id; }
  get userId(): string { return this.data.userId; }
  get youtubeConnectionId(): string | null { return this.data.youtubeConnectionId; }
  get name(): string { return this.data.name; }
  get description(): string | null { return this.data.description; }
  get status(): string { return this.data.status; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }

  isActive(): boolean { return this.data.status === "active"; }

  toRaw(): ProjectData { return { ...this.data }; }
}

export function createProject(data: ProjectData): Project {
  return new Project(data);
}
