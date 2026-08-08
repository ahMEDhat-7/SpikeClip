"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/application/hooks/use-auth";
import { Loader2, User } from "lucide-react";
import { SUCCESS_MESSAGE_TIMEOUT_MS } from "@/lib/constants";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, updateProfile, refreshUser } = useAuth();
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    };
  }, []);

  const handleProfileSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);

    try {
      await updateProfile({ name });
      await refreshUser();
      setProfileSuccess(true);
      profileTimerRef.current = setTimeout(() => setProfileSuccess(false), SUCCESS_MESSAGE_TIMEOUT_MS);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setProfileSaving(false);
    }
  }, [name, updateProfile, refreshUser]);

  if (authLoading) {
    return (
      <main className="container mx-auto p-4 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-5 w-40 bg-muted rounded animate-pulse" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-9 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="container mx-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>
              Update your display name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileError && (
                <div className="p-3 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
                  Profile updated successfully
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <Input
                  value={user.email}
                  disabled
                  className="opacity-60"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email is managed by your Google account
                </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{user.plan}</Badge>
                  <span className="text-sm text-muted-foreground font-mono">
                    {user.analysesUsed}/{user.analysesLimit} analyses
                  </span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
