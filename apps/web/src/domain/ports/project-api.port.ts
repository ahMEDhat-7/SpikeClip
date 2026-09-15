export interface Project {
  id: string;
  userId: string;
  youtubeConnectionId: string | null;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSource {
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
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScene {
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
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedClip {
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
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProjectWithDetails {
  project: Project;
  sources: ProjectSource[];
  scenes: ProjectScene[];
  clips: GeneratedClip[];
}

export interface ProjectApiPort {
  list(): Promise<Project[]>;
  get(projectId: string): Promise<Project>;
  create(data: { name: string; description?: string; youtubeConnectionId?: string }): Promise<Project>;
  update(projectId: string, data: { name?: string; description?: string }): Promise<Project>;
  remove(projectId: string): Promise<void>;
  getDetails(projectId: string): Promise<ProjectWithDetails>;
  listSources(projectId: string): Promise<ProjectSource[]>;
  addSource(projectId: string, videoId: string): Promise<ProjectSource>;
  addSourceByUrl(projectId: string, url: string): Promise<ProjectSource>;
  removeSource(projectId: string, sourceId: string): Promise<void>;
  listScenes(projectId: string): Promise<ProjectScene[]>;
  generateScenes(projectId: string, sourceId: string): Promise<{ status: string; bullJobId?: string; sourceId?: string; message?: string }>;
  updateScene(projectId: string, sceneId: string, data: { startTime?: number; endTime?: number; status?: string }): Promise<ProjectScene>;
  removeScene(projectId: string, sceneId: string): Promise<void>;
  listClips(projectId: string): Promise<GeneratedClip[]>;
  getClip(projectId: string, clipId: string): Promise<GeneratedClip>;
  removeClip(projectId: string, clipId: string): Promise<void>;
  exportClips(projectId: string, sceneIds: string[], config?: { platform?: string; quality?: string; format?: string }): Promise<{ clipIds: string[]; count: number }>;
}
