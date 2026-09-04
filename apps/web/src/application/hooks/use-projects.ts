"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectApi } from "@/application/providers/api-provider";
import type { Project, ProjectWithDetails } from "@/domain/ports/project-api.port";

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  create: (data: { name: string; description?: string; youtubeConnectionId?: string }) => Promise<Project>;
  remove: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const projectApi = useProjectApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const list = await projectApi.list();
      setProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    }
  }, [projectApi]);

  useEffect(() => {
    loadProjects().finally(() => setLoading(false));
  }, [loadProjects]);

  const create = useCallback(async (data: { name: string; description?: string; youtubeConnectionId?: string }) => {
    const project = await projectApi.create(data);
    await loadProjects();
    return project;
  }, [projectApi, loadProjects]);

  const remove = useCallback(async (projectId: string) => {
    await projectApi.remove(projectId);
    await loadProjects();
  }, [projectApi, loadProjects]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadProjects();
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  return { projects, loading, error, create, remove, refresh };
}

interface UseProjectDetailsReturn {
  data: ProjectWithDetails | null;
  loading: boolean;
  error: string | null;
  addSource: (videoId: string) => Promise<void>;
  addSourceByUrl: (url: string) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
  generateScenes: (sourceId: string) => Promise<{ status: string; message?: string; sceneCount?: number }>;
  updateScene: (sceneId: string, data: { startTime?: number; endTime?: number; status?: string }) => Promise<void>;
  exportClips: (sceneIds: string[], config?: { platform?: string; quality?: string; format?: string }) => Promise<{ clipIds: string[]; count: number }>;
  refresh: () => Promise<void>;
}

export function useProjectDetails(projectId: string): UseProjectDetailsReturn {
  const projectApi = useProjectApi();
  const [data, setData] = useState<ProjectWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      const details = await projectApi.getDetails(projectId);
      setData(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    }
  }, [projectApi, projectId]);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    loadDetails().finally(() => setLoading(false));
  }, [loadDetails, projectId]);

  const addSource = useCallback(async (videoId: string) => {
    await projectApi.addSource(projectId, videoId);
    await loadDetails();
  }, [projectApi, projectId, loadDetails]);

  const addSourceByUrl = useCallback(async (url: string) => {
    await projectApi.addSourceByUrl(projectId, url);
    await loadDetails();
  }, [projectApi, projectId, loadDetails]);

  const removeSource = useCallback(async (sourceId: string) => {
    await projectApi.removeSource(projectId, sourceId);
    await loadDetails();
  }, [projectApi, projectId, loadDetails]);

  const generateScenes = useCallback(async (sourceId: string) => {
    const result = await projectApi.generateScenes(projectId, sourceId);

    if (result.status === "already_running") {
      return { status: "already_running" as const, message: result.message };
    }

    // Poll until scenes appear or source status changes from "analyzing"
    const maxAttempts = 60;
    const pollInterval = 2000;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      await loadDetails();

      // Check if scenes have been generated
      const updated = await projectApi.getDetails(projectId);
      const source = updated.sources.find((s) => s.id === sourceId);
      if (source && source.sourceStatus !== "analyzing") {
        const scenesForSource = updated.scenes.filter((s) => s.sourceId === sourceId);
        return {
          status: source.sourceStatus === "completed" ? "completed" : "error",
          sceneCount: scenesForSource.length,
          message: source.sourceStatus === "error" ? source.errorMessage ?? undefined : undefined,
        };
      }
    }

    return { status: "timeout" as const, message: "Generation is taking longer than expected. Check back later." };
  }, [projectApi, projectId, loadDetails]);

  const updateScene = useCallback(async (sceneId: string, updateData: { startTime?: number; endTime?: number; status?: string }) => {
    await projectApi.updateScene(projectId, sceneId, updateData);
    await loadDetails();
  }, [projectApi, projectId, loadDetails]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadDetails();
    } finally {
      setLoading(false);
    }
  }, [loadDetails]);

  const exportClips = useCallback(async (sceneIds: string[], config?: { platform?: string; quality?: string; format?: string }) => {
    return projectApi.exportClips(projectId, sceneIds, config);
  }, [projectApi, projectId]);

  return { data, loading, error, addSource, addSourceByUrl, removeSource, generateScenes, updateScene, exportClips, refresh };
}
