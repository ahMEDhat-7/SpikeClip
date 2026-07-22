import { FilterGraphBuilder } from "../../infrastructure/external/filter-graph-builder";
import { StudioAction } from "@spikeclips/shared";

describe("FilterGraphBuilder", () => {
  let builder: FilterGraphBuilder;

  beforeEach(() => {
    builder = new FilterGraphBuilder();
  });

  describe("buildCommand", () => {
    it("should build a basic command with crop and scale", () => {
      const { command, filterComplex } = builder.buildCommand({
        actions: [],
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(command).toContain("-i");
      expect(command).toContain("/tmp/input.mp4");
      expect(command).toContain("/tmp/output.mp4");
      expect(filterComplex).toContain("crop=ih*9/16:ih");
      expect(filterComplex).toContain("scale=1080:1920");
    });

    it("should include platform-specific codecs", () => {
      const { command } = builder.buildCommand({
        actions: [],
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(command).toContain("-c:v");
      expect(command).toContain("libx264");
      expect(command).toContain("-c:a");
      expect(command).toContain("aac");
    });

    it("should include WebM codecs for webm format", () => {
      const { command } = builder.buildCommand({
        actions: [],
        platform: "youtube-shorts",
        quality: "1080p",
        format: "webm",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.webm",
      });

      expect(command).toContain("libvpx-vp9");
      expect(command).toContain("libopus");
    });

    it("should apply caption filters", () => {
      const actions: StudioAction[] = [
        {
          action: "add_captions",
          text: "Hello",
          font: "impact",
          size: 48,
          color: "#FFFFFF",
          position: "center",
          start: 0,
          end: 5,
          animation: "none",
          style: "normal",
          opacity: 1,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("drawtext");
      expect(filterComplex).toContain("Hello");
    });

    it("should apply vignette effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "vignette",
          intensity: 0.5,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("vignette=angle=");
    });

    it("should apply speed change", () => {
      const actions: StudioAction[] = [
        {
          action: "set_speed",
          rate: 2.0,
          preservePitch: true,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("setpts=PTS/2");
      expect(filterComplex).toContain("atempo=2");
    });

    it("should chain atempo for rates > 2x", () => {
      const actions: StudioAction[] = [
        {
          action: "set_speed",
          rate: 4.0,
          preservePitch: true,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("atempo=2,atempo=2");
    });

    it("should apply fade transition", () => {
      const actions: StudioAction[] = [
        {
          action: "set_transition",
          type: "fade",
          duration: 0.5,
          position: "start",
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("fade=t=in");
    });

    it("should apply overlay with timing", () => {
      const actions: StudioAction[] = [
        {
          action: "add_overlay",
          assetKey: "logo.png",
          x: 85,
          y: 5,
          scale: 0.3,
          opacity: 0.8,
          startTime: 1,
          endTime: 10,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("overlay=");
      expect(filterComplex).toContain("enable='between(t,1,10)'");
    });

    it("should apply background color", () => {
      const actions: StudioAction[] = [
        {
          action: "add_background",
          color: "#FF0000",
          startTime: 0,
          endTime: 5,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("drawbox=");
      expect(filterComplex).toContain("#FF0000");
    });

    it("should apply bw effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "bw",
          intensity: 1,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("hue=s=0");
    });

    it("should apply sepia effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "sepia",
          intensity: 1,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("colorchannelmixer=");
    });

    it("should apply blur effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "blur",
          intensity: 0.5,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("boxblur=");
    });

    it("should apply sharpen effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "sharpen",
          intensity: 0.5,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("unsharp=");
    });

    it("should apply zoom_in effect", () => {
      const actions: StudioAction[] = [
        {
          action: "apply_effect",
          type: "zoom_in",
          intensity: 0.5,
        },
      ];

      const { filterComplex } = builder.buildCommand({
        actions,
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/output.mp4",
      });

      expect(filterComplex).toContain("zoompan=");
    });
  });

  describe("buildPreviewCommand", () => {
    it("should use 480p quality for preview", () => {
      const { command } = builder.buildPreviewCommand({
        actions: [],
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/preview.mp4",
      });

      expect(command).toContain("-crf");
      expect(command).toContain("28");
    });

    it("should cap duration at 30s", () => {
      const { command } = builder.buildPreviewCommand({
        actions: [],
        platform: "youtube-shorts",
        quality: "1080p",
        format: "mp4",
        inputPath: "/tmp/input.mp4",
        outputPath: "/tmp/preview.mp4",
        duration: 60,
      });

      expect(command).toContain("-t");
      expect(command).toContain("30");
    });
  });
});
