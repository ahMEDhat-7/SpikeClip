"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, FolderOpen, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/application/hooks/use-projects";
import { useYoutubeConnection } from "@/application/hooks/use-youtube-connection";
import { toastError, toastSuccess } from "@/lib/toast";

function DashboardContent() {
  const router = useRouter();
  const { projects, loading, error, create, remove } = useProjects();
  const { connected, channel, connect } = useYoutubeConnection();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const project = await create({ name: newProjectName.trim() });
      setNewProjectName("");
      setShowNewProject(false);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your projects</p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="default">
                {channel?.title ?? "Connected"}
              </Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={connect}>
                Connect YouTube
              </Button>
            )}
            <Button onClick={() => setShowNewProject(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {showNewProject && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creating}
                >
                  {creating ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No projects yet</p>
              <Button
                className="mt-4"
                onClick={() => setShowNewProject(true)}
              >
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{project.name}</h3>
                      {project.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${project.id}/editor`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this project?")) {
                            remove(project.id).catch((err) => {
                              toastError(err instanceof Error ? err.message : "Failed to delete project");
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
