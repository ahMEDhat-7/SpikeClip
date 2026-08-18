import { PlanTier } from "@spikeclip/shared";

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  plan: PlanTier;
  analysesUsed: number;
  analysesLimit: number;
  scenesLimit: number;
  clipsUsed: number;
  clipsLimit: number;
  createdAt: string;
}

export interface AuthApiPort {
  logout(): Promise<void>;
  getProfile(): Promise<UserResponse | null>;
  updateProfile(data: { name?: string }): Promise<UserResponse>;
}
