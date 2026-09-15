// Algorithm types (snake_case — matches Python source of truth)

export interface HeatmapSpike {
  start_time: number;
  end_time: number;
  value: number;
}

export interface MergedBlock {
  start_time: number;
  end_time: number;
  peak_intensity: number;
  last_value: number;
  weighted_sum: number;
  total_duration: number;
  used_floor_override: boolean;
  segments: HeatmapSpike[];
}

export interface ScoredBlock {
  start_time: number;
  end_time: number;
  duration: number;
  peak_intensity: number;
  avg_intensity: number;
  score: number;
  confidence: "high" | "floor_override";
  capped: boolean;
}

export interface AlgorithmConfig {
  gap_tolerance: number;
  intensity_tolerance: number;
  min_intensity_cutoff: number;
  min_clip_duration: number;
  max_clip_duration: number;
  target_duration_range: [number, number];
  top_n: number;
  min_spacing: number;
  weight_peak: number;
  weight_avg: number;
  weight_duration_fit: number;
}

export const DEFAULT_ALGORITHM_CONFIG: AlgorithmConfig = {
  gap_tolerance: 5.0,
  intensity_tolerance: 0.25,
  min_intensity_cutoff: 0.40,
  min_clip_duration: 3.0,
  max_clip_duration: 60.0,
  target_duration_range: [15.0, 60.0],
  top_n: 3,
  min_spacing: 5.0,
  weight_peak: 0.4,
  weight_avg: 0.4,
  weight_duration_fit: 0.2,
};

// Job types (camelCase — matches Prisma/database schema)

export type JobStatus = "pending" | "processing" | "completed" | "failed";

// Clip types

export type ClipStatus = "pending" | "processing" | "completed" | "failed";

// User types

export type PlanTier = "free" | "pro" | "team";

// ── MENA CPM Data ──────────────────────────────────────────────────────────

export interface CpmData {
  country: string;
  countryCode: string;
  youtubeCpm: number;
  tiktokCpmMin: number;
  tiktokCpmMax: number;
}

export const MENA_CPM_DATA: CpmData[] = [
  { country: "UAE", countryCode: "AE", youtubeCpm: 1.93, tiktokCpmMin: 3, tiktokCpmMax: 6 },
  { country: "Saudi Arabia", countryCode: "SA", youtubeCpm: 0.99, tiktokCpmMin: 2, tiktokCpmMax: 5 },
  { country: "Jordan", countryCode: "JO", youtubeCpm: 0.45, tiktokCpmMin: 1, tiktokCpmMax: 4 },
  { country: "Morocco", countryCode: "MA", youtubeCpm: 0.38, tiktokCpmMin: 1, tiktokCpmMax: 3 },
  { country: "Egypt", countryCode: "EG", youtubeCpm: 0.34, tiktokCpmMin: 1, tiktokCpmMax: 3 },
  { country: "Iraq", countryCode: "IQ", youtubeCpm: 0.32, tiktokCpmMin: 1, tiktokCpmMax: 3 },
  { country: "Tunisia", countryCode: "TN", youtubeCpm: 0.29, tiktokCpmMin: 1, tiktokCpmMax: 3 },
];

export const MENA_COUNTRIES = MENA_CPM_DATA.map((c) => c.countryCode);

export function getCpmForCountry(countryCode: string): CpmData | undefined {
  return MENA_CPM_DATA.find((c) => c.countryCode === countryCode.toUpperCase());
}

export function getAverageMenaCpm(): number {
  const sum = MENA_CPM_DATA.reduce((acc, c) => acc + c.youtubeCpm, 0);
  return sum / MENA_CPM_DATA.length;
}

export function isArabicContent(title?: string, description?: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (title && arabicRegex.test(title)) return true;
  if (description && arabicRegex.test(description)) return true;
  return false;
}

export function cpmAdjustedScore(baseScore: number, countryCode?: string): number {
  if (!countryCode || !MENA_COUNTRIES.includes(countryCode.toUpperCase())) {
    return baseScore;
  }
  const cpm = getCpmForCountry(countryCode);
  if (!cpm) return baseScore;
  const avgCpm = getAverageMenaCpm();
  const multiplier = avgCpm / cpm.youtubeCpm;
  return Math.min(1, baseScore * (1 + (multiplier - 1) * 0.3));
}
