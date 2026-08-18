# Algorithm

The spike detection algorithm identifies the most-replayed moments in YouTube videos using actual viewer heatmap data.

## Overview

Located at `packages/shared/src/algorithm/merge.ts` (62 tests).

TypeScript port of `CreateYTShorts.py` (v2). Canonical defaults defined in `packages/shared/src/types.ts` (`DEFAULT_ALGORITHM_CONFIG`).

## Pipeline

```
Raw HeatmapSpike[] (from yt-dlp)
    ↓
normalizeHeatmapValues()     → Normalize intensities to 0–1
    ↓
mergeHeatmapSpikes()         → Merge contiguous spikes
    ↓
capAndScoreBlocks()          → Apply duration limits, compute scores
    ↓
selectTopScenes()            → Greedy top-N selection
    ↓
padScenes()                  → Pad each scene by ±5s, merge overlaps
    ↓
ScoredBlock[]                → Final scenes
```

## Functions

### `normalizeHeatmapValues(spikes)`

Normalizes intensity values to the 0–1 range. Handles edge cases:
- All zeros → returns zeros
- Values already ≤ 1 → clamps to [0, 1]
- Values > 1 → divides by max

### `mergeHeatmapSpikes(spikes, gapTolerance, intensityTolerance, minIntensityCutoff)`

Merges contiguous spikes into larger blocks using chronological iteration.

**Merge criteria (any of):**
- Time gap ≤ `gap_tolerance` AND intensity delta ≤ `intensity_tolerance`
- Both values ≥ `min_intensity_cutoff` (floor override)

### `capAndScoreBlocks(blocks, minClipDuration, maxClipDuration, targetDurationRange, weights)`

1. Finds best sub-window within each block (sliding window)
2. Caps to min/max duration
3. Computes composite score: `weight_peak × peak + weight_avg × avg + weight_duration_fit × durationFit`

### `selectTopScenes(scoredBlocks, topN, minSpacing)`

Greedy selection with non-overlap constraint:
1. Sort by score descending
2. Select highest score
3. Skip blocks that overlap or are within `min_spacing` of selected
4. Repeat until `top_n` selected

### `padScenes(scenes, videoDuration, padSeconds=5)`

Pads each scene by ±5 seconds (configurable), clamps to `[0, videoDuration]`, merges overlapping scenes after padding.

## Default Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `gap_tolerance` | 5.0s | Max gap between spikes to merge |
| `intensity_tolerance` | 0.25 | Max intensity delta to merge |
| `min_intensity_cutoff` | 0.40 | Floor override threshold |
| `min_clip_duration` | 3.0s | Minimum clip length |
| `max_clip_duration` | 60.0s | Maximum clip length |
| `target_duration_range` | [15.0, 60.0] | Ideal clip duration |
| `top_n` | 3 | Number of scenes to select |
| `min_spacing` | 5.0s | Minimum gap between selected scenes |
| `weight_peak` | 0.4 | Peak intensity score weight |
| `weight_avg` | 0.4 | Average intensity score weight |
| `weight_duration_fit` | 0.2 | Duration fitness score weight |

## Types

| Type | Fields |
|------|--------|
| `HeatmapSpike` | `start_time`, `end_time`, `value` |
| `MergedBlock` | `start_time`, `end_time`, `peak_intensity`, `last_value`, `weighted_sum`, `total_duration`, `used_floor_override`, `segments` |
| `ScoredBlock` | `start_time`, `end_time`, `duration`, `peak_intensity`, `avg_intensity`, `score`, `confidence`, `capped` |
| `AlgorithmConfig` | All parameters above |

## Tests

```bash
pnpm --filter @spikeclip/shared test
```

62 test cases covering:
- Merge logic (gap, intensity, floor override)
- Scoring (weights, duration fit)
- Selection (non-overlap, spacing, top-N)
- Normalization (edge cases, NaN, Infinity)
- Config validation
- Scene padding
- Performance (10K spikes)
