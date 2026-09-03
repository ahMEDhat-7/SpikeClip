import { User } from "../entities/user.entity";

export const USER_REPOSITORY = "USER_REPOSITORY";

export interface OAuthUserData {
  id: string;
  email: string;
  name: string;
  oauthProvider: string;
  oauthProviderId: string;
  plan: string;
  analysesUsed: number;
  analysesLimit: number;
  scenesLimit: number;
  clipsLimit: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByStripeCustomerId(customerId: string): Promise<User | null>;
  findByOAuthProvider(provider: string, providerId: string): Promise<User | null>;
  linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<User>;
  createOAuthUser(data: OAuthUserData): Promise<User>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  save(user: User): Promise<User>;
  checkAndResetMonthlyUsage(userId: string, resetAt?: Date | null): Promise<void>;
  canUserAnalyze(userId: string): Promise<boolean>;
  canUserExportClips(userId: string, count: number): Promise<boolean>;
  incrementAnalyses(userId: string): Promise<boolean>;
  decrementAnalyses(userId: string): Promise<boolean>;
  incrementClips(userId: string, count: number): Promise<boolean>;
}
