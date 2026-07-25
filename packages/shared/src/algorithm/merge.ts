import {
  HeatmapSpike,
  MergedBlock,
  ScoredBlock,
  AlgorithmConfig,
  DEFAULT_ALGORITHM_CONFIG as DEFAULT_CONFIG,
} from "../types";

export class AlgorithmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlgorithmConfigError";
  }
}

export function validateAlgorithmConfig(cfg: Partial<AlgorithmConfig>): void {
  const c = { ...DEFAULT_CONFIG, ...cfg };

  if (c.gap_tolerance < 0) {
    throw new AlgorithmConfigError(`gap_tolerance must be >= 0, got ${c.gap_tolerance}`);
  }
  if (c.intensity_tolerance < 0 || c.intensity_tolerance > 1) {
    throw new AlgorithmConfigError(
      `intensity_tolerance must be in [0, 1], got ${c.intensity_tolerance}`
    );
  }
  if (c.min_intensity_cutoff < 0 || c.min_intensity_cutoff > 1) {
    throw new AlgorithmConfigError(
      `min_intensity_cutoff must be in [0, 1], got ${c.min_intensity_cutoff}`
    );
  }
  if (c.min_clip_duration <= 0) {
    throw new AlgorithmConfigError(
      `min_clip_duration must be > 0, got ${c.min_clip_duration}`
    );
  }
  if (c.max_clip_duration < c.min_clip_duration) {
    throw new AlgorithmConfigError(
      `max_clip_duration (${c.max_clip_duration}) must be >= min_clip_duration (${c.min_clip_duration})`
    );
  }
  if (c.target_duration_range[0] > c.target_duration_range[1]) {
    throw new AlgorithmConfigError(
      `target_duration_range[0] (${c.target_duration_range[0]}) must be <= target_duration_range[1] (${c.target_duration_range[1]})`
    );
  }
  if (c.top_n < 1) {
    throw new AlgorithmConfigError(`top_n must be >= 1, got ${c.top_n}`);
  }
  if (c.min_spacing < 0) {
    throw new AlgorithmConfigError(`min_spacing must be >= 0, got ${c.min_spacing}`);
  }
  if (c.weight_peak < 0 || c.weight_peak > 1) {
    throw new AlgorithmConfigError(`weight_peak must be in [0, 1], got ${c.weight_peak}`);
  }
  if (c.weight_avg < 0 || c.weight_avg > 1) {
    throw new AlgorithmConfigError(`weight_avg must be in [0, 1], got ${c.weight_avg}`);
  }
  if (c.weight_duration_fit < 0 || c.weight_duration_fit > 1) {
    throw new AlgorithmConfigError(`weight_duration_fit must be in [0, 1], got ${c.weight_duration_fit}`);
  }
  const totalWeight = c.weight_peak + c.weight_avg + c.weight_duration_fit;
  if (totalWeight <= 0) {
    throw new AlgorithmConfigError(`sum of weights must be > 0, got ${totalWeight}`);
  }
  if (Math.abs(totalWeight - 1.0) > 1e-9) {
    throw new AlgorithmConfigError(`sum of weights must equal 1.0, got ${totalWeight}`);
  }
}

export function normalizeHeatmapValues(spikes: HeatmapSpike[]): HeatmapSpike[] {
  if (!spikes.length) return spikes;

  let maxVal = -Infinity;
  let hasInvalid = false;
  for (const s of spikes) {
    const v = s.value;
    if (!Number.isFinite(v)) {
      hasInvalid = true;
    } else if (v > maxVal) {
      maxVal = v;
    }
  }

  if (hasInvalid || maxVal <= 0) {
    return spikes.map((s) => ({
      ...s,
      value: Number.isFinite(s.value) ? Math.max(0, Math.min(1, s.value)) : 0,
    }));
  }

  if (maxVal > 1.0) {
    return spikes.map((s) => ({
      ...s,
      value: Number.isFinite(s.value) ? Math.max(0, s.value / maxVal) : 0,
    }));
  }

  return spikes.map((s) => ({
    ...s,
    value: Number.isFinite(s.value) ? Math.max(0, Math.min(1, s.value)) : 0,
  }));
}

export function convertSecondsToTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function mergeHeatmapSpikes(
  rawSpikes: HeatmapSpike[],
  gapTolerance: number = DEFAULT_CONFIG.gap_tolerance,
  intensityTolerance: number = DEFAULT_CONFIG.intensity_tolerance,
  minIntensityCutoff: number = DEFAULT_CONFIG.min_intensity_cutoff
): MergedBlock[] {
  const valid = rawSpikes.filter(
    (s) =>
      s.start_time != null &&
      s.end_time != null &&
      Number.isFinite(s.start_time) &&
      Number.isFinite(s.end_time) &&
      s.end_time > s.start_time
  );
  if (!valid.length) return [];

  const chronological = [...valid].sort((a, b) => a.start_time - b.start_time);
  const blocks: MergedBlock[] = [];

  for (const seg of chronological) {
    const value = Number.isFinite(seg.value) ? Math.max(0, Math.min(1, seg.value)) : 0;
    const duration = Math.max(seg.end_time - seg.start_time, 0.0);

    if (!blocks.length) {
      blocks.push({
        start_time: seg.start_time,
        end_time: seg.end_time,
        peak_intensity: value,
        last_value: value,
        weighted_sum: value * duration,
        total_duration: duration,
        used_floor_override: false,
        segments: [seg],
      });
      continue;
    }

    const prev = blocks[blocks.length - 1];
    const timeGapOk = seg.start_time <= prev.end_time + gapTolerance;
    const delta = Math.abs(value - prev.last_value);
    const intensityOk = delta <= intensityTolerance;
    const floorOk = value >= minIntensityCutoff && prev.last_value >= minIntensityCutoff;

    if (timeGapOk && (intensityOk || floorOk)) {
      const overlap = Math.max(0, prev.end_time - seg.start_time);
      const addedDuration = Math.max(0, duration - overlap);

      prev.end_time = Math.max(prev.end_time, seg.end_time);
      prev.peak_intensity = Math.max(prev.peak_intensity, value);
      prev.last_value = value;
      prev.weighted_sum += value * addedDuration;
      prev.total_duration += addedDuration;
      prev.segments.push(seg);
      if (!intensityOk && floorOk) {
        prev.used_floor_override = true;
      }
    } else {
      blocks.push({
        start_time: seg.start_time,
        end_time: seg.end_time,
        peak_intensity: value,
        last_value: value,
        weighted_sum: value * duration,
        total_duration: duration,
        used_floor_override: false,
        segments: [seg],
      });
    }
  }

  return blocks;
}

function bestSubwindow(
  segments: HeatmapSpike[],
  maxClipDuration: number,
  minClipDuration: number = 0
): {
  start_time: number;
  end_time: number;
  peak_intensity: number;
  avg_intensity: number;
  segments: HeatmapSpike[];
} | null {
  if (!segments.length) return null;

  let best: {
    start_time: number;
    end_time: number;
    peak_intensity: number;
    avg_intensity: number;
    segments: HeatmapSpike[];
  } | null = null;
  let bestCombined = -1;
  let left = 0;
  let windowWeighted = 0.0;
  let windowDuration = 0.0;
  let windowPeak = 0.0;

  for (let right = 0; right < segments.length; right++) {
    const seg = segments[right];
    const segDur = seg.end_time - seg.start_time;
    const segVal = Number.isFinite(seg.value) ? seg.value : 0;
    windowWeighted += segVal * segDur;
    windowDuration += segDur;
    if (segVal > windowPeak) windowPeak = segVal;

    while (
      segments[right].end_time - segments[left].start_time > maxClipDuration &&
      left < right
    ) {
      const lseg = segments[left];
      const lsegDur = lseg.end_time - lseg.start_time;
      const lsegVal = Number.isFinite(lseg.value) ? lseg.value : 0;
      windowWeighted -= lsegVal * lsegDur;
      windowDuration -= lsegDur;
      left++;

      if (left <= right) {
        let newPeak = 0;
        for (let k = left; k <= right; k++) {
          const v = Number.isFinite(segments[k].value) ? segments[k].value : 0;
          if (v > newPeak) newPeak = v;
        }
        windowPeak = newPeak;
      }
    }

    const span = segments[right].end_time - segments[left].start_time;
    if (span <= maxClipDuration && windowDuration >= minClipDuration && windowDuration > 0) {
      const avg = windowWeighted / windowDuration;
      const combined = 0.6 * avg + 0.4 * windowPeak;
      if (!best || combined > bestCombined) {
        bestCombined = combined;
        best = {
          start_time: segments[left].start_time,
          end_time: segments[right].end_time,
          peak_intensity: windowPeak,
          avg_intensity: avg,
          segments: segments.slice(left, right + 1),
        };
      }
    }
  }

  return best;
}

export function capAndScoreBlocks(
  mergedBlocks: MergedBlock[],
  minClipDuration: number = DEFAULT_CONFIG.min_clip_duration,
  maxClipDuration: number = DEFAULT_CONFIG.max_clip_duration,
  targetDurationRange: [number, number] = DEFAULT_CONFIG.target_duration_range,
  weightPeak: number = DEFAULT_CONFIG.weight_peak,
  weightAvg: number = DEFAULT_CONFIG.weight_avg,
  weightDurationFit: number = DEFAULT_CONFIG.weight_duration_fit
): ScoredBlock[] {
  const [lo, hi] = targetDurationRange;
  const results: ScoredBlock[] = [];

  for (const block of mergedBlocks) {
    const avgIntensity =
      block.total_duration > 0
        ? block.weighted_sum / block.total_duration
        : block.peak_intensity;

    let start: number;
    let end: number;
    let peak: number;
    let avg: number;
    let capped: boolean;

    const blockDuration = block.end_time - block.start_time;

    if (blockDuration > maxClipDuration) {
      const sub = bestSubwindow(block.segments, maxClipDuration, minClipDuration);
      if (!sub) continue;
      start = sub.start_time;
      end = sub.end_time;
      peak = sub.peak_intensity;
      avg = sub.avg_intensity;
      capped = true;
    } else {
      start = block.start_time;
      end = block.end_time;
      peak = block.peak_intensity;
      avg = avgIntensity;
      capped = false;
    }

    const finalDuration = end - start;
    if (finalDuration < minClipDuration) continue;
    if (peak <= 0) continue;

    let durationFit: number;
    if (finalDuration < lo) {
      durationFit = finalDuration / lo;
    } else if (finalDuration > hi) {
      durationFit = Math.max(0.0, 1 - (finalDuration - hi) / hi);
    } else {
      durationFit = 1.0;
    }

    const score = weightPeak * peak + weightAvg * avg + weightDurationFit * durationFit;

    results.push({
      start_time: start,
      end_time: end,
      duration: finalDuration,
      peak_intensity: peak,
      avg_intensity: avg,
      score,
      confidence: block.used_floor_override ? "floor_override" : "high",
      capped,
    });
  }

  return results;
}

export function selectTopScenes(
  scoredBlocks: ScoredBlock[],
  topN: number = DEFAULT_CONFIG.top_n,
  minSpacing: number = DEFAULT_CONFIG.min_spacing
): ScoredBlock[] {
  const ranked = [...scoredBlocks].sort((a, b) => b.score - a.score);
  const selected: ScoredBlock[] = [];

  for (const candidate of ranked) {
    const conflict = selected.some(
      (s) =>
        !(
          candidate.end_time + minSpacing <= s.start_time ||
          candidate.start_time - minSpacing >= s.end_time
        )
    );
    if (!conflict) {
      selected.push(candidate);
    }
    if (selected.length >= topN) break;
  }

  return [...selected].sort((a, b) => a.start_time - b.start_time);
}

export function extractTopScenes(
  rawSpikes: HeatmapSpike[],
  config: Partial<AlgorithmConfig> = {}
): ScoredBlock[] {
  validateAlgorithmConfig(config);
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const normalized = normalizeHeatmapValues(rawSpikes);

  const merged = mergeHeatmapSpikes(
    normalized,
    cfg.gap_tolerance,
    cfg.intensity_tolerance,
    cfg.min_intensity_cutoff
  );

  const scored = capAndScoreBlocks(
    merged,
    cfg.min_clip_duration,
    cfg.max_clip_duration,
    cfg.target_duration_range,
    cfg.weight_peak,
    cfg.weight_avg,
    cfg.weight_duration_fit
  );

  return selectTopScenes(scored, cfg.top_n, cfg.min_spacing);
}

export function padScenes(
  scenes: ScoredBlock[],
  padding: number,
  videoDuration?: number
): ScoredBlock[] {
  if (!scenes.length) return scenes;

  const padded = scenes.map((s) => ({
    ...s,
    start_time: Math.max(0, s.start_time - padding),
    end_time: videoDuration != null
      ? Math.min(videoDuration, s.end_time + padding)
      : s.end_time + padding,
  }));

  padded.sort((a, b) => a.start_time - b.start_time);

  const merged: ScoredBlock[] = [];
  for (const scene of padded) {
    if (merged.length === 0) {
      merged.push(scene);
      continue;
    }

    const prev = merged[merged.length - 1];
    if (scene.start_time <= prev.end_time) {
      const prevDuration = prev.end_time - prev.start_time;
      const sceneDuration = scene.end_time - scene.start_time;
      const totalDuration = prevDuration + sceneDuration;

      prev.end_time = Math.max(prev.end_time, scene.end_time);
      prev.duration = prev.end_time - prev.start_time;
      prev.peak_intensity = Math.max(prev.peak_intensity, scene.peak_intensity);
      prev.avg_intensity = totalDuration > 0
        ? (prev.avg_intensity * prevDuration + scene.avg_intensity * sceneDuration) / totalDuration
        : (prev.avg_intensity + scene.avg_intensity) / 2;
      prev.score = Math.max(prev.score, scene.score);
      if (scene.capped) prev.capped = true;
      if (scene.confidence === "floor_override") prev.confidence = "floor_override";
    } else {
      merged.push(scene);
    }
  }

  return merged.map((s) => ({
    ...s,
    duration: s.end_time - s.start_time,
  }));
}
