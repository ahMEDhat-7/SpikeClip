import { IsArray, ValidateNested, IsNumber, Min, Max, IsOptional, IsString, IsObject, IsNotEmpty, IsBoolean, IsIn, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator, MaxLength, Matches, ArrayMinSize } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { StudioAction } from "@spikeclips/shared";

class ExportSceneDto {
  @ApiProperty({ description: "Scene start time in seconds", example: 10.5 })
  @IsNumber()
  @Min(0)
  start_time!: number;

  @ApiProperty({ description: "Scene end time in seconds", example: 60.5 })
  @IsNumber()
  @Min(0)
  end_time!: number;

  @ApiProperty({ description: "Peak intensity (optional)", example: 0.85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  peak_intensity?: number;
}

@ValidatorConstraint({ name: "SceneTimeRange", async: false })
class SceneTimeRangeConstraint implements ValidatorConstraintInterface {
  validate(scenes: ExportSceneDto[]): boolean {
    if (!Array.isArray(scenes)) return false;
    return scenes.every((s) => s.end_time > s.start_time);
  }

  defaultMessage(): string {
    return "Each scene must have end_time greater than start_time";
  }
}

function IsValidSceneTimeRange() {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsValidSceneTimeRange",
      target: object.constructor,
      propertyName,
      constraints: [],
      validator: SceneTimeRangeConstraint,
    });
  };
}

class CaptionDto {
  @ApiProperty({ description: "Caption text", example: "Check this out!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;

  @ApiProperty({ description: "Font family", example: "inter" })
  @IsString()
  @IsNotEmpty()
  @IsIn(["inter", "impact", "bebas", "playfair", "mono"])
  font!: string;

  @ApiProperty({ description: "Font size in px", example: 48 })
  @IsNumber()
  @Min(1)
  size!: number;

  @ApiProperty({ description: "Text color hex", example: "#FFFFFF" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color!: string;

  @ApiProperty({ description: "Position on screen", example: "center", enum: ["top", "center", "bottom"] })
  @IsString()
  @IsIn(["top", "center", "bottom"])
  position!: string;

  @ApiProperty({ description: "Text alignment", example: "center", enum: ["left", "center", "right"], required: false })
  @IsOptional()
  @IsString()
  @IsIn(["left", "center", "right"])
  textAlign?: string;

  @ApiProperty({ description: "Start frame for this caption", example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startFrame?: number;

  @ApiProperty({ description: "End frame for this caption", example: 60, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endFrame?: number;

  @ApiProperty({ description: "Text animation type", example: "pop", enum: ["pop", "slide", "fade", "none"] })
  @IsString()
  @IsIn(["pop", "slide", "fade", "none"])
  animation!: string;

  @ApiProperty({ description: "Text style", example: "bold", enum: ["bold", "outlined", "shadow", "neon"], required: false })
  @IsOptional()
  @IsString()
  @IsIn(["bold", "outlined", "shadow", "neon"])
  textStyle?: string;

  @ApiProperty({ description: "Text opacity 0-1", example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiProperty({ description: "Background color hex", example: "#000000", required: false })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  backgroundColor?: string;

  @ApiProperty({ description: "Background enabled", example: false, required: false })
  @IsOptional()
  @IsBoolean()
  backgroundEnabled?: boolean;

  @ApiProperty({ description: "Stroke width", example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  strokeWidth?: number;

  @ApiProperty({ description: "Shadow radius", example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shadowRadius?: number;

  @ApiProperty({ description: "Horizontal position percent 0-100", example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number;

  @ApiProperty({ description: "Vertical position percent 0-100", example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number;
}

class MusicConfigDto {
  @ApiProperty({ description: "Music file key in storage", example: "user-id/abc-track.mp3" })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty({ description: "Music volume 0-1", example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  volume!: number;

  @ApiProperty({ description: "Original audio volume 0-1", example: 1.0 })
  @IsNumber()
  @Min(0)
  @Max(1)
  originalVolume!: number;

  @ApiProperty({ description: "Fade in seconds", example: 2 })
  @IsNumber()
  @Min(0)
  fadeIn!: number;

  @ApiProperty({ description: "Fade out seconds", example: 2 })
  @IsNumber()
  @Min(0)
  fadeOut!: number;
}

class TemplateConfigDto {
  @ApiPropertyOptional({ description: "Layout style", enum: ["full", "split-horizontal", "split-vertical", "grid"] })
  @IsOptional()
  @IsString()
  @IsIn(["full", "split-horizontal", "split-vertical", "grid"])
  layout?: string;

  @ApiPropertyOptional({ description: "Text animation type", enum: ["pop", "slide", "fade", "none"] })
  @IsOptional()
  @IsString()
  @IsIn(["pop", "slide", "fade", "none"])
  textAnimation?: string;

  @ApiPropertyOptional({ description: "Transition in type", enum: ["cut", "fade", "slide", "zoom"] })
  @IsOptional()
  @IsString()
  @IsIn(["cut", "fade", "slide", "zoom"])
  transitionIn?: string;

  @ApiPropertyOptional({ description: "Transition out type", enum: ["cut", "fade", "slide", "zoom"] })
  @IsOptional()
  @IsString()
  @IsIn(["cut", "fade", "slide", "zoom"])
  transitionOut?: string;

  @ApiPropertyOptional({ description: "Text position", enum: ["top", "center", "bottom"] })
  @IsOptional()
  @IsString()
  @IsIn(["top", "center", "bottom"])
  textPosition?: string;

  @ApiPropertyOptional({ description: "Text style", enum: ["bold", "outlined", "shadow", "neon"] })
  @IsOptional()
  @IsString()
  @IsIn(["bold", "outlined", "shadow", "neon"])
  textStyle?: string;

  @ApiPropertyOptional({ description: "Overlay effects to apply", example: ["vignette", "countdown-numbers"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  overlayEffects?: string[];
}

export class ExportClipsDto {
  @ApiProperty({
    description: "Scenes to export as clips (user-defined start/end times)",
    type: [ExportSceneDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExportSceneDto)
  @IsValidSceneTimeRange()
  scenes!: ExportSceneDto[];

  @ApiPropertyOptional({ description: "Target platform", example: "youtube-shorts", enum: ["youtube-shorts", "instagram-reels", "tiktok"] })
  @IsOptional()
  @IsString()
  @IsIn(["youtube-shorts", "instagram-reels", "tiktok"])
  platform?: string;

  @ApiPropertyOptional({ description: "Output format", example: "mp4", enum: ["mp4", "webm"] })
  @IsOptional()
  @IsString()
  @IsIn(["mp4", "webm"])
  format?: string;

  @ApiPropertyOptional({ description: "Output quality", example: "1080p", enum: ["720p", "1080p"] })
  @IsOptional()
  @IsString()
  @IsIn(["720p", "1080p"])
  quality?: string;

  @ApiPropertyOptional({ description: "Captions to overlay on clips", type: [CaptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaptionDto)
  captions?: CaptionDto[];

  @ApiPropertyOptional({ description: "Background music configuration" })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MusicConfigDto)
  music?: MusicConfigDto;

  @ApiPropertyOptional({ description: "Selected template ID", example: "kinetic-typography" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  templateId?: string;

  @ApiPropertyOptional({ description: "Template configuration override" })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  templateConfig?: TemplateConfigDto;

  @ApiPropertyOptional({ description: "Studio actions to apply (from prompt-based editing)", type: "array", items: { type: "object" } })
  @IsOptional()
  @IsArray()
  actions?: StudioAction[];
}
