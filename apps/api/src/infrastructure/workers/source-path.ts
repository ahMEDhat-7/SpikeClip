import { join } from "path";

export const SOURCE_DIR = "/tmp/spikeclips-source";

export function getSourcePath(jobId: string): string {
  return join(SOURCE_DIR, `${jobId}.mp4`);
}
