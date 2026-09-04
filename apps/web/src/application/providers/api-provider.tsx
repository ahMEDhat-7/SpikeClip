"use client";

import { createContext, useContext, ReactNode } from "react";
import { JobApiPort } from "@/domain/ports/job-api.port";
import { AuthApiPort } from "@/domain/ports/auth-api.port";
import { YoutubeApiPort } from "@/domain/ports/youtube-api.port";
import { ProjectApiPort } from "@/domain/ports/project-api.port";
import { jobApi } from "@/infrastructure/api/job-api.client";
import { authApi } from "@/infrastructure/api/auth-api.client";
import { YoutubeApiClient } from "@/infrastructure/api/youtube-api.client";
import { ProjectApiClient } from "@/infrastructure/api/project-api.client";

interface ApiContextType {
  jobApi: JobApiPort;
  authApi: AuthApiPort;
  youtubeApi: YoutubeApiPort;
  projectApi: ProjectApiPort;
}

const ApiContext = createContext<ApiContextType | null>(null);

const youtubeApi = new YoutubeApiClient();
const projectApi = new ProjectApiClient();

export function ApiProvider({ children }: { children: ReactNode }) {
  return (
    <ApiContext.Provider value={{ jobApi, authApi, youtubeApi, projectApi }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useJobApi(): JobApiPort {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useJobApi must be used within ApiProvider");
  return ctx.jobApi;
}

export function useAuthApi(): AuthApiPort {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useAuthApi must be used within ApiProvider");
  return ctx.authApi;
}

export function useYoutubeApi(): YoutubeApiPort {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useYoutubeApi must be used within ApiProvider");
  return ctx.youtubeApi;
}

export function useProjectApi(): ProjectApiPort {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useProjectApi must be used within ApiProvider");
  return ctx.projectApi;
}
