import { Injectable, Logger, OnModuleInit, ForbiddenException } from "@nestjs/common";
import { writeFile, readFile, mkdir, unlink, access } from "fs/promises";
import { join, resolve } from "path";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { StorageService } from "./storage.interface";
import { createHmac, timingSafeEqual } from "crypto";

const CLIPS_DIR = process.env.CLIPS_DIR || "/tmp/spikeclips-clips";

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private signingSecret!: string;

  onModuleInit() {
    this.signingSecret = process.env.CLIP_SIGNING_SECRET || "";
    if (!this.signingSecret) {
      throw new Error("CLIP_SIGNING_SECRET environment variable is required");
    }
  }

  async upload(file: Buffer, key: string, _contentType: string): Promise<string> {
    const filePath = join(CLIPS_DIR, key);
    const resolved = resolve(filePath);
    if (!resolved.startsWith(resolve(CLIPS_DIR))) {
      throw new ForbiddenException("Invalid storage key");
    }

    const dir = resolved.substring(0, resolved.lastIndexOf("/"));
    await mkdir(dir, { recursive: true });
    await writeFile(resolved, file);

    this.logger.log(`Stored file: ${resolved} (${file.length} bytes)`);
    return key;
  }

  async uploadFromFile(filePath: string, key: string, _contentType: string): Promise<string> {
    const destPath = join(CLIPS_DIR, key);
    const resolvedDest = resolve(destPath);
    if (!resolvedDest.startsWith(resolve(CLIPS_DIR))) {
      throw new ForbiddenException("Invalid storage key");
    }

    const dir = resolvedDest.substring(0, resolvedDest.lastIndexOf("/"));
    await mkdir(dir, { recursive: true });

    const fileBuffer = await readFile(filePath);
    await writeFile(resolvedDest, fileBuffer);

    this.logger.log(`Stored file from ${filePath}: ${resolvedDest} (${fileBuffer.length} bytes)`);
    return key;
  }

  async getSignedUrl(key: string, expiresInSec: number = 3600): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSec;
    const signature = createHmac("sha256", this.signingSecret)
      .update(`${key}:${expires}`)
      .digest("hex")
      .slice(0, 32);

    const baseUrl = process.env.CLIPS_BASE_URL || `http://localhost:${process.env.PORT || 3001}/api`;
    return `${baseUrl}/clips/download/${encodeURIComponent(key)}?expires=${expires}&sig=${signature}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(CLIPS_DIR, key);
    const resolved = resolve(filePath);
    if (!resolved.startsWith(resolve(CLIPS_DIR))) {
      throw new ForbiddenException("Invalid storage key");
    }
    await unlink(resolved);
    this.logger.log(`Deleted file: ${resolved}`);
  }

  async createReadStream(key: string): Promise<Readable> {
    const filePath = join(CLIPS_DIR, key);
    const resolved = resolve(filePath);
    if (!resolved.startsWith(resolve(CLIPS_DIR))) {
      throw new ForbiddenException("Invalid storage key");
    }
    return createReadStream(resolved);
  }

  static verifySignature(key: string, expires: number, sig: string): boolean {
    if (Date.now() / 1000 > expires) return false;

    const signingSecret = process.env.CLIP_SIGNING_SECRET || "";
    const expected = createHmac("sha256", signingSecret)
      .update(`${key}:${expires}`)
      .digest("hex")
      .slice(0, 32);

    try {
      return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<{ status: string; message?: string }> {
    try {
      await access(CLIPS_DIR);
      return { status: "ok" };
    } catch {
      return { status: "error", message: `Clips directory "${CLIPS_DIR}" not accessible` };
    }
  }
}
