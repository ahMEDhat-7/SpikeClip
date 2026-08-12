import { describeAction, DESTRUCTIVE_ACTIONS, StudioEditContextSchema } from "../ai-context";
import { StudioAction } from "../studio-actions";

describe("describeAction", () => {
  it("describes add_captions with a truncated label", () => {
    const action: StudioAction = {
      action: "add_captions",
      text: "Hello world this is a very long caption text",
      start: 0,
      end: 3,
      font: "impact",
      size: 72,
      color: "#FFFFFF",
      position: "center",
      style: "bold",
      animation: "none",
      opacity: 1,
      backgroundEnabled: false,
      strokeWidth: 2,
      shadowRadius: 2,
    };
    const desc = describeAction(action);
    expect(desc).toContain("Hello world this is a very long caption");
    expect(desc).toContain("0s-3s");
  });

  it("describes set_speed", () => {
    const action: StudioAction = { action: "set_speed", rate: 2, preservePitch: true };
    expect(describeAction(action)).toContain("2x");
  });

  it("describes trim", () => {
    const action: StudioAction = { action: "trim", startTime: 1, endTime: 5 };
    expect(describeAction(action)).toContain("1s");
  });

  it("describes mix_audio", () => {
    const action: StudioAction = {
      action: "mix_audio",
      volume: 0.3,
      originalVolume: 1,
      fadeIn: 0,
      fadeOut: 0,
      startTime: 0,
      tone: "normal",
    };
    expect(describeAction(action)).toContain("30%");
  });
});

describe("DESTRUCTIVE_ACTIONS", () => {
  it("marks transform-style actions as destructive", () => {
    expect(DESTRUCTIVE_ACTIONS.has("trim")).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has("set_speed")).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has("apply_effect")).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has("add_overlay")).toBe(true);
    expect(DESTRUCTIVE_ACTIONS.has("add_background")).toBe(true);
  });

  it("does not mark additive actions as destructive", () => {
    expect(DESTRUCTIVE_ACTIONS.has("add_captions")).toBe(false);
    expect(DESTRUCTIVE_ACTIONS.has("mix_audio")).toBe(false);
  });
});

describe("StudioEditContextSchema", () => {
  it("validates a minimal context", () => {
    const parsed = StudioEditContextSchema.safeParse({
      platform: "youtube-shorts",
      aspectRatio: "9:16",
      maxDuration: 60,
      sceneStart: 0,
      sceneEnd: 15,
      sceneDuration: 15,
      availableAssets: [],
      currentActions: [],
      captions: [],
      availableTemplates: [],
    });
    expect(parsed.success).toBe(true);
  });
});
