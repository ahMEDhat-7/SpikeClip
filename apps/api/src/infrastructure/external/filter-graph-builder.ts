import { Injectable } from "@nestjs/common";
import {
  StudioAction,
  AddCaptionsAction,
  MixAudioAction,
  ApplyEffectAction,
  SetSpeedAction,
  AddOverlayAction,
  SetTransitionAction,
  AddBackgroundAction,
  TrimAction,
  PlatformId,
  OutputQuality,
  OutputFormat,
  getPlatformEncodingPreset,
  getQualityPreset,
  getFormatCodecs,
  FONT_MAP,
} from "@spikeclips/shared";

interface FilterChain {
  videoFilters: string[];
  audioFilters: string[];
  duration?: number;
  trimStart?: number;
  trimDuration?: number;
}

interface BuildCommandInput {
  actions: StudioAction[];
  platform: PlatformId;
  quality: OutputQuality;
  format: OutputFormat;
  inputPath: string;
  outputPath: string;
  startTime?: number;
  duration?: number;
}

interface BuildCommandResult {
  command: string[];
  filterComplex: string;
}

@Injectable()
export class FilterGraphBuilder {
  buildCommand(input: BuildCommandInput): BuildCommandResult {
    const { actions, platform, quality, format, inputPath, outputPath, startTime, duration } = input;
    const preset = getPlatformEncodingPreset(platform);
    const qualityPreset = getQualityPreset(quality);
    const formatCodecs = getFormatCodecs(format);

    const chain: FilterChain = { videoFilters: [], audioFilters: [], duration };

    chain.videoFilters.push(`crop=ih*9/16:ih,scale=${preset.resolution.width}:${preset.resolution.height}`);

    for (const action of actions) {
      this.applyAction(action, chain);
    }

    const effectiveStartTime = chain.trimStart ?? startTime;
    const effectiveDuration = chain.trimDuration ?? duration;

    const videoFilterStr = chain.videoFilters.join(",");
    const hasAudioFilters = chain.audioFilters.length > 0;
    const audioFilterStr = hasAudioFilters ? chain.audioFilters.join(",") : null;

    let filterComplex = `[0:v]${videoFilterStr}[vout]`;
    if (audioFilterStr) {
      filterComplex += `;[0:a]${audioFilterStr}[aout]`;
    }

    const args: string[] = ["-y"];

    if (effectiveStartTime !== undefined) {
      args.push("-ss", effectiveStartTime.toString());
    }

    args.push("-i", inputPath);

    if (effectiveDuration !== undefined) {
      args.push("-t", effectiveDuration.toString());
    }

    args.push("-filter_complex", filterComplex);
    args.push("-map", "[vout]");

    if (hasAudioFilters) {
      args.push("-map", "[aout]");
    }

    args.push(...formatCodecs);
    args.push("-crf", qualityPreset.crf);
    args.push(outputPath);

    return { command: args, filterComplex };
  }

  private applyAction(action: StudioAction, chain: FilterChain): void {
    switch (action.action) {
      case "add_captions":
        this.applyCaptions(action, chain);
        break;
      case "mix_audio":
        this.applyMixAudio(action, chain);
        break;
      case "apply_effect":
        this.applyEffect(action, chain);
        break;
      case "set_speed":
        this.applySpeed(action, chain);
        break;
      case "add_overlay":
        this.applyOverlay(action, chain);
        break;
      case "set_transition":
        this.applyTransition(action, chain);
        break;
      case "add_background":
        this.applyBackground(action, chain);
        break;
      case "trim":
        this.applyTrim(action, chain);
        break;
    }
  }

  private applyCaptions(action: AddCaptionsAction, chain: FilterChain): void {
    const fontFile = FONT_MAP[action.font] || FONT_MAP.inter;
    const x = action.x !== undefined ? `(${action.x}*w/100)` : "(w-text_w)/2";
    const y = action.y !== undefined ? `(${action.y}*h/100)` : this.getPositionY(action.position);

    let drawtext = `drawtext=fontfile='${fontFile}':text='${action.text.replace(/'/g, "\\'")}':fontsize=${action.size}:fontcolor=${action.color}@${action.opacity}:x=${x}:y=${y}:enable='between(t,${action.start},${action.end})'`;

    if (action.style === "outlined") {
      drawtext += `:borderw=${action.strokeWidth}:bordercolor=black`;
    } else if (action.style === "shadow") {
      drawtext += `:shadowx=2:shadowy=2:shadowcolor=black@0.5`;
    } else if (action.style === "neon") {
      drawtext += `:borderw=2:bordercolor=${action.color}`;
    } else if (action.style === "bold") {
      const boldFont = FONT_MAP.impact || fontFile;
      drawtext = `drawtext=fontfile='${boldFont}':text='${action.text.replace(/'/g, "\\'")}':fontsize=${action.size}:fontcolor=${action.color}@${action.opacity}:x=${x}:y=${y}:enable='between(t,${action.start},${action.end})'`;
    }

    if (action.backgroundEnabled && action.backgroundColor) {
      drawtext += `:box=1:boxcolor=${action.backgroundColor}@0.5:boxborderw=10`;
    }

    if (action.animation === "fade") {
      const fadeDuration = 0.3;
      drawtext += `:alpha='if(between(t,${action.start},${action.start + fadeDuration}),clip((t-${action.start})/${fadeDuration},0,1),1)'`;
    } else if (action.animation === "pop") {
      const popDuration = 0.15;
      drawtext += `:fontsize='if(between(t,${action.start},${action.start + popDuration}),${action.size * 0.5}+${action.size * 2}*clip((t-${action.start})/${popDuration},0,1),${action.size})'`;
    }

    chain.videoFilters.push(drawtext);
  }

  private getPositionY(position: "top" | "center" | "bottom"): string {
    switch (position) {
      case "top":
        return "(h*0.1)";
      case "bottom":
        return "(h-text_h-h*0.1)";
      case "center":
      default:
        return "(h-text_h)/2";
    }
  }

  private applyMixAudio(action: MixAudioAction, chain: FilterChain): void {
    chain.audioFilters.push(`volume=${action.originalVolume}`);

    if (action.tone === "bass_boost") {
      chain.audioFilters.push("equalizer=f=60:t=q:w=1:g=10");
    } else if (action.tone === "treble_boost") {
      chain.audioFilters.push("equalizer=f=8000:t=q:w=1:g=8");
    } else if (action.tone === "warm") {
      chain.audioFilters.push("equalizer=f=200:t=q:w=1:g=5,equalizer=f=3000:t=q:w=1:g=-3");
    }
  }

  private applyEffect(action: ApplyEffectAction, chain: FilterChain): void {
    const intensity = action.intensity;
    const enableStr = action.startTime !== undefined && action.endTime !== undefined
      ? `:enable='between(t,${action.startTime},${action.endTime})'`
      : "";

    switch (action.type) {
      case "vignette": {
        const angle = intensity * Math.PI / 2;
        chain.videoFilters.push(`vignette=angle=${angle}${enableStr}`);
        break;
      }
      case "zoom_in": {
        const targetZoom = 1 + intensity * 0.5;
        chain.videoFilters.push(`zoompan=z='min(zoom+0.001,${targetZoom})':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'${enableStr}`);
        break;
      }
      case "zoom_out": {
        const targetZoom = 1 + intensity * 0.5;
        chain.videoFilters.push(`zoompan=z='if(eq(on,1),${targetZoom},max(zoom-0.001,1.0))':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'${enableStr}`);
        break;
      }
      case "blur": {
        const radius = Math.round(intensity * 20);
        chain.videoFilters.push(`boxblur=${radius}:${radius}${enableStr}`);
        break;
      }
      case "sharpen": {
        const amount = intensity * 1.5;
        chain.videoFilters.push(`unsharp=5:5:${amount}:5:5:${amount}${enableStr}`);
        break;
      }
      case "sepia":
        chain.videoFilters.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131${enableStr}`);
        break;
      case "bw":
        chain.videoFilters.push(`hue=s=0${enableStr}`);
        break;
      case "glitch": {
        chain.videoFilters.push(`rgbashift=rh=3:bh=-3${enableStr}`);
        chain.videoFilters.push(`noise=alls=20:allf=t${enableStr}`);
        break;
      }
      case "glow":
        chain.videoFilters.push(`gblur=sigma=20,format=rgba,colorchannelmixer=aa=0.5,overlay${enableStr}`);
        break;
    }
  }

  private applySpeed(action: SetSpeedAction, chain: FilterChain): void {
    chain.videoFilters.push(`setpts=PTS/${action.rate}`);

    if (action.rate > 2) {
      const sqrtRate = Math.sqrt(action.rate);
      chain.audioFilters.push(`atempo=${sqrtRate},atempo=${sqrtRate}`);
    } else {
      chain.audioFilters.push(`atempo=${action.rate}`);
    }
  }

  private applyOverlay(action: AddOverlayAction, chain: FilterChain): void {
    const x = `${action.x}*iw/100`;
    const y = `${action.y}*ih/100`;
    const scale = action.scale ?? 1.0;
    const enableStr = action.startTime !== undefined && action.endTime !== undefined
      ? `:enable='between(t,${action.startTime},${action.endTime})'`
      : "";
    chain.videoFilters.push(`scale=${scale}:flags=lanczos[overlay];overlay=x=${x}:y=${y}${enableStr}`);
  }

  private applyTransition(action: SetTransitionAction, chain: FilterChain): void {
    if (action.position === "start") {
      chain.videoFilters.push(`fade=t=in:d=${action.duration}:st=0`);
    } else {
      const videoDuration = chain.duration ?? 60;
      const fadeStart = Math.max(0, videoDuration - action.duration);
      chain.videoFilters.push(`fade=t=out:d=${action.duration}:st=${fadeStart}`);
    }
  }

  private applyBackground(action: AddBackgroundAction, chain: FilterChain): void {
    chain.videoFilters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=${action.color}@1:enable='between(t,${action.startTime},${action.endTime})'`);
  }

  private applyTrim(action: TrimAction, chain: FilterChain): void {
    if (action.startTime !== undefined) {
      chain.trimStart = action.startTime;
    }
    if (action.endTime !== undefined && chain.trimStart !== undefined) {
      chain.trimDuration = action.endTime - chain.trimStart;
    } else if (action.endTime !== undefined) {
      chain.trimDuration = action.endTime;
    }
  }

  buildPreviewCommand(input: BuildCommandInput): BuildCommandResult {
    const previewInput = {
      ...input,
      quality: "480p" as OutputQuality,
      duration: Math.min(input.duration || 30, 30),
    };
    return this.buildCommand(previewInput);
  }
}
