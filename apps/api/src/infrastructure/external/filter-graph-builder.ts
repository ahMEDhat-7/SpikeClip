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

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "%%")
      .replace(/\$/g, "\\$")
      .replace(/'/g, "'\\''")
      .replace(/:/g, "\\:")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  }

  private applyCaptions(action: AddCaptionsAction, chain: FilterChain): void {
    const fontFile = FONT_MAP[action.font] || FONT_MAP.inter;
    const escapedText = this.escapeText(action.text);

    let x: string;
    if (action.x !== undefined) {
      x = `(${action.x}*w/100-text_w/2)`;
    } else {
      switch (action.position) {
        case "left":
          x = "(w*0.05)";
          break;
        case "right":
          x = "(w-w*0.05-text_w)";
          break;
        case "center":
        default:
          x = "(w-text_w)/2";
          break;
      }
    }

    const y = action.y !== undefined ? `(${action.y}*h/100)` : this.getPositionY(action.position);

    const baseFilters: string[] = [
      `fontfile='${fontFile}'`,
      `text='${escapedText}'`,
      `fontsize=${action.size}`,
      `fontcolor=${action.color}@${action.opacity}`,
      `x=${x}`,
      `y=${y}`,
      `enable='between(t,${action.start},${action.end})'`,
    ];

    if (action.style === "outlined") {
      baseFilters.push(`borderw=${action.strokeWidth}`);
      baseFilters.push(`bordercolor=black`);
    } else if (action.style === "shadow") {
      baseFilters.push(`shadowx=2`);
      baseFilters.push(`shadowy=2`);
      baseFilters.push(`shadowcolor=black@0.5`);
    } else if (action.style === "neon") {
      baseFilters.push(`borderw=3`);
      baseFilters.push(`bordercolor=${action.color}`);
      baseFilters.push(`shadowx=0`);
      baseFilters.push(`shadowy=0`);
      baseFilters.push(`shadowcolor=${action.color}@0.6`);
    } else if (action.style === "bold") {
      const boldFont = FONT_MAP.impact || fontFile;
      baseFilters[0] = `fontfile='${boldFont}'`;
    }

    if (action.backgroundEnabled && action.backgroundColor) {
      baseFilters.push(`box=1`);
      baseFilters.push(`boxcolor=${action.backgroundColor}@0.5`);
      baseFilters.push(`boxborderw=10`);
    }

    if (action.animation === "fade") {
      const fadeDuration = 0.3;
      baseFilters.push(`alpha='if(between(t,${action.start},${action.start + fadeDuration}),clip((t-${action.start})/${fadeDuration},0,1),1)'`);
    } else if (action.animation === "pop") {
      const popDuration = 0.15;
      baseFilters.push(`fontsize='if(between(t,${action.start},${action.start + popDuration}),${action.size * 0.5}+${action.size * 2}*clip((t-${action.start})/${popDuration},0,1),${action.size})'`);
    } else if (action.animation === "slide") {
      const slideDuration = 0.4;
      baseFilters.push(`y='if(between(t,${action.start},${action.start + slideDuration}),${y.replace(/\(/g, "(").replace(/\)/g, ")")}-h+(${y.replace(/\(/g, "(").replace(/\)/g, ")")}+h)*clip((t-${action.start})/${slideDuration},0,1),${y})'`);
      baseFilters.push(`alpha='if(between(t,${action.start},${action.start + slideDuration}),clip((t-${action.start})/${slideDuration},0,1),1)'`);
    } else if (action.animation === "typewriter") {
      const charCount = action.text.length;
      const typewriterDuration = Math.min(charCount * 0.05, 2);
      baseFilters.push(`text='${escapedText}'`);
      baseFilters.push(`enable='between(t,${action.start},${action.end})'`);
    }

    const drawtext = `drawtext=${baseFilters.join(":")}`;
    chain.videoFilters.push(drawtext);

    if (action.animation === "pop" && action.text.includes(" ")) {
      const words = action.text.split(" ");
      const wordDuration = (action.end - action.start) / words.length;
      chain.videoFilters.pop();
      words.forEach((word, i) => {
        const wordStart = action.start + i * wordDuration;
        const wordEnd = wordStart + wordDuration;
        const staggerDelay = i * 0.08;
        const popStart = wordStart + staggerDelay;
        const popEnd = popStart + 0.15;
        const escapedWord = this.escapeText(word);

        let wordX: string;
        if (action.x !== undefined) {
          wordX = `(${action.x}*w/100-text_w/2)`;
        } else {
          wordX = "(w-text_w)/2";
        }

        const wordDrawtext = [
          `drawtext=fontfile='${fontFile}'`,
          `text='${escapedWord}'`,
          `fontsize='if(between(t,${popStart},${popEnd}),${action.size * 0.5}+${action.size * 2}*clip((t-${popStart})/0.15,0,1),${action.size})'`,
          `fontcolor=${action.color}@${action.opacity}`,
          `x=${wordX}`,
          `y=${action.y !== undefined ? `(${action.y}*h/100)` : this.getPositionY(action.position)}`,
          `enable='between(t,${wordStart},${wordEnd})'`,
        ];

        if (action.style === "outlined") {
          wordDrawtext.push(`borderw=${action.strokeWidth}`);
          wordDrawtext.push(`bordercolor=black`);
        } else if (action.style === "neon") {
          wordDrawtext.push(`borderw=3`);
          wordDrawtext.push(`bordercolor=${action.color}`);
        }

        chain.videoFilters.push(wordDrawtext.join(":"));
      });
    }
  }

  private getPositionY(position: "top" | "center" | "bottom" | "left" | "right"): string {
    switch (position) {
      case "top":
        return "(h*0.1)";
      case "bottom":
        return "(h-text_h-h*0.1)";
      case "left":
      case "right":
      case "center":
      default:
        return "(h-text_h)/2";
    }
  }

  private applyMixAudio(action: MixAudioAction, chain: FilterChain): void {
    chain.audioFilters.push(`volume=${action.originalVolume}`);

    if (action.fadeIn > 0) {
      chain.audioFilters.push(`afade=t=in:st=0:d=${action.fadeIn}`);
    }
    if (action.fadeOut > 0) {
      const videoDuration = chain.duration ?? 60;
      const fadeStart = Math.max(0, videoDuration - action.fadeOut);
      chain.audioFilters.push(`afade=t=out:st=${fadeStart}:d=${action.fadeOut}`);
    }

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
        chain.videoFilters.push(`gblur=sigma=${Math.round(intensity * 10)},format=rgba,colorchannelmixer=aa=${intensity * 0.5}`);
        break;
    }
  }

  private applySpeed(action: SetSpeedAction, chain: FilterChain): void {
    chain.videoFilters.push(`setpts=PTS/${action.rate}`);

    if (action.rate > 2) {
      const sqrtRate = Math.sqrt(action.rate);
      chain.audioFilters.push(`atempo=${sqrtRate},atempo=${sqrtRate}`);
    } else if (action.rate < 0.5) {
      chain.audioFilters.push(`atempo=0.5,atempo=${action.rate / 0.5}`);
    } else {
      chain.audioFilters.push(`atempo=${action.rate}`);
    }
  }

  private applyOverlay(action: AddOverlayAction, chain: FilterChain): void {
    const x = `${action.x}*iw/100`;
    const y = `${action.y}*ih/100`;
    const scale = action.scale ?? 1.0;
    chain.videoFilters.push(`scale=${scale}:flags=lanczos`);
  }

  private applyTransition(action: SetTransitionAction, chain: FilterChain): void {
    const d = action.duration;

    switch (action.type) {
      case "fade":
        if (action.position === "start") {
          chain.videoFilters.push(`fade=t=in:d=${d}:st=0`);
        } else {
          const videoDuration = chain.duration ?? 60;
          const fadeStart = Math.max(0, videoDuration - d);
          chain.videoFilters.push(`fade=t=out:d=${d}:st=${fadeStart}`);
        }
        break;

      case "slide_left":
        if (action.position === "start") {
          chain.videoFilters.push(`crop=iw*3/4:ih:iw*1/4:0:enable='between(t,0,${d})'`);
          chain.videoFilters.push(`fade=t=in:d=${d}:st=0`);
        } else {
          const videoDuration = chain.duration ?? 60;
          const fadeStart = Math.max(0, videoDuration - d);
          chain.videoFilters.push(`fade=t=out:d=${d}:st=${fadeStart}`);
        }
        break;

      case "slide_right":
        if (action.position === "start") {
          chain.videoFilters.push(`crop=iw*3/4:ih:0:0:enable='between(t,0,${d})'`);
          chain.videoFilters.push(`fade=t=in:d=${d}:st=0`);
        } else {
          const videoDuration = chain.duration ?? 60;
          const fadeStart = Math.max(0, videoDuration - d);
          chain.videoFilters.push(`fade=t=out:d=${d}:st=${fadeStart}`);
        }
        break;

      case "zoom":
        if (action.position === "start") {
          chain.videoFilters.push(`zoompan=z='if(between(t,0,${d}),1+0.5*clip(t/${d},0,1),1)':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
        } else {
          const videoDuration = chain.duration ?? 60;
          const zoomStart = Math.max(0, videoDuration - d);
          chain.videoFilters.push(`zoompan=z='if(between(t,${zoomStart},${videoDuration}),1.5-0.5*clip((t-${zoomStart})/${d},0,1),1)':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
        }
        break;

      case "wipe":
        if (action.position === "start") {
          chain.videoFilters.push(`crop=iw*0/1:ih:0:0:enable='between(t,0,${d})',fade=t=in:d=${d}:st=0`);
        } else {
          const videoDuration = chain.duration ?? 60;
          const wipeStart = Math.max(0, videoDuration - d);
          chain.videoFilters.push(`fade=t=out:d=${d}:st=${wipeStart}`);
        }
        break;
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
