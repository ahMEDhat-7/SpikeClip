import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required");
  return Buffer.from(key, "hex");
}

function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(ciphertext: string, iv: string, tag: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function packToken(ciphertext: string, iv: string, tag: string): string {
  return `${ciphertext}:${iv}:${tag}`;
}

function unpackToken(packed: string): { ciphertext: string; iv: string; tag: string } {
  const [ciphertext, iv, tag] = packed.split(":");
  if (!ciphertext || !iv || !tag) throw new Error("Invalid packed token format");
  return { ciphertext, iv, tag };
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthTokenVaultService {
  private readonly logger = new Logger(AuthTokenVaultService.name);

  constructor(private readonly prisma: PrismaService) {}

  async storeTokens(
    youtubeConnectionId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const encAccess = encrypt(accessToken);
    const encRefresh = encrypt(refreshToken);

    await this.prisma.oAuthCredential.upsert({
      where: { youtubeConnectionId },
      create: {
        youtubeConnectionId,
        encryptedAccessToken: packToken(encAccess.ciphertext, encAccess.iv, encAccess.tag),
        encryptedRefreshToken: packToken(encRefresh.ciphertext, encRefresh.iv, encRefresh.tag),
        kmsKeyId: "local-aes256",
        expiresAt,
      },
      update: {
        encryptedAccessToken: packToken(encAccess.ciphertext, encAccess.iv, encAccess.tag),
        encryptedRefreshToken: packToken(encRefresh.ciphertext, encRefresh.iv, encRefresh.tag),
        kmsKeyId: "local-aes256",
        expiresAt,
      },
    });

    this.logger.log(`Stored tokens for connection ${youtubeConnectionId}`);
  }

  async getTokens(youtubeConnectionId: string): Promise<StoredTokens | null> {
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { youtubeConnectionId },
    });
    if (!credential) return null;

    const access = unpackToken(credential.encryptedAccessToken);
    const refresh = unpackToken(credential.encryptedRefreshToken);

    return {
      accessToken: decrypt(access.ciphertext, access.iv, access.tag),
      refreshToken: decrypt(refresh.ciphertext, refresh.iv, refresh.tag),
      expiresAt: credential.expiresAt,
    };
  }

  async getAccessToken(youtubeConnectionId: string): Promise<string | null> {
    const tokens = await this.getTokens(youtubeConnectionId);
    if (!tokens) return null;

    if (tokens.expiresAt > new Date()) {
      return tokens.accessToken;
    }

    this.logger.log(`Token expired for connection ${youtubeConnectionId}, needs refresh`);
    return null;
  }

  async deleteTokens(youtubeConnectionId: string): Promise<void> {
    await this.prisma.oAuthCredential.delete({
      where: { youtubeConnectionId },
    }).catch(() => {});
  }

  async markExpired(youtubeConnectionId: string): Promise<void> {
    await this.prisma.oAuthCredential.update({
      where: { youtubeConnectionId },
      data: { expiresAt: new Date(0) },
    }).catch(() => {});
  }
}
