"use client";

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuthApi } from "@/application/providers/api-provider";
import { toastWarning } from "@/lib/toast";
import { PlanTier } from "@spikeclips/shared";

interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
  analysesUsed: number;
  analysesLimit: number;
  scenesLimit: number;
  clipsUsed: number;
  clipsLimit: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function useAuthProvider(): AuthContextType {
  const authApi = useAuthApi();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUserFromProfile = useCallback((profile: { id: string; email: string; name: string; plan: PlanTier; analysesUsed: number; analysesLimit: number; scenesLimit: number; clipsUsed: number; clipsLimit: number; createdAt?: string }) => {
    setUser({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      plan: profile.plan,
      analysesUsed: profile.analysesUsed,
      analysesLimit: profile.analysesLimit,
      scenesLimit: profile.scenesLimit,
      clipsUsed: profile.clipsUsed,
      clipsLimit: profile.clipsLimit,
      createdAt: profile.createdAt,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      if (profile) {
        setUserFromProfile(profile);
      } else {
        setUser(null);
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError && err.message.includes("fetch");
      if (isNetworkError) {
        toastWarning("Connection issue. Please check your network.");
      }
      setUser(null);
    }
  }, [setUserFromProfile]);

  useEffect(() => {
    authApi
      .getProfile()
      .then((profile) => {
        if (profile) {
          setUserFromProfile(profile);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [setUserFromProfile]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with client-side logout even if API call fails
    }
    setUser(null);
    window.location.href = "/login";
  }, []);

  const updateProfile = useCallback(async (data: { name?: string }) => {
    const updated = await authApi.updateProfile(data);
    setUserFromProfile(updated);
  }, [setUserFromProfile]);

  return { user, isLoading, logout, updateProfile, refreshUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
