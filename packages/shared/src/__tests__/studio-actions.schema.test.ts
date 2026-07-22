import {
  AddCaptionsActionSchema,
  MixAudioActionSchema,
  ApplyEffectActionSchema,
  SetSpeedActionSchema,
  AddOverlayActionSchema,
  SetTransitionActionSchema,
  AddBackgroundActionSchema,
  TrimActionSchema,
  StudioActionSchema,
  StudioActionsArraySchema,
  ClarificationResponseSchema,
} from "../studio-actions";

describe("Studio Action Schemas", () => {
  describe("AddCaptionsActionSchema", () => {
    it("should validate a valid caption action", () => {
      const result = AddCaptionsActionSchema.parse({
        action: "add_captions",
        text: "Hello World",
        start: 0,
        end: 5,
      });
      expect(result.action).toBe("add_captions");
      expect(result.text).toBe("Hello World");
      expect(result.font).toBe("inter");
      expect(result.size).toBe(48);
      expect(result.color).toBe("#FFFFFF");
      expect(result.position).toBe("center");
      expect(result.animation).toBe("none");
      expect(result.style).toBe("normal");
      expect(result.opacity).toBe(1);
    });

    it("should reject text shorter than 1 character", () => {
      expect(() =>
        AddCaptionsActionSchema.parse({
          action: "add_captions",
          text: "",
          start: 0,
          end: 5,
        })
      ).toThrow();
    });

    it("should reject size outside 12-120 range", () => {
      expect(() =>
        AddCaptionsActionSchema.parse({
          action: "add_captions",
          text: "Test",
          size: 10,
          start: 0,
          end: 5,
        })
      ).toThrow();
    });

    it("should reject invalid color format", () => {
      expect(() =>
        AddCaptionsActionSchema.parse({
          action: "add_captions",
          text: "Test",
          color: "red",
          start: 0,
          end: 5,
        })
      ).toThrow();
    });

    it("should accept all valid fonts", () => {
      const fonts = ["inter", "impact", "bebas", "playfair", "mono"];
      for (const font of fonts) {
        const result = AddCaptionsActionSchema.parse({
          action: "add_captions",
          text: "Test",
          font,
          start: 0,
          end: 5,
        });
        expect(result.font).toBe(font);
      }
    });
  });

  describe("MixAudioActionSchema", () => {
    it("should validate a valid mix audio action", () => {
      const result = MixAudioActionSchema.parse({
        action: "mix_audio",
        volume: 0.5,
        originalVolume: 0.8,
        fadeIn: 2,
        fadeOut: 3,
      });
      expect(result.action).toBe("mix_audio");
      expect(result.volume).toBe(0.5);
      expect(result.originalVolume).toBe(0.8);
      expect(result.tone).toBe("normal");
    });

    it("should reject volume outside 0-1 range", () => {
      expect(() =>
        MixAudioActionSchema.parse({
          action: "mix_audio",
          volume: 1.5,
          originalVolume: 0.5,
          fadeIn: 0,
          fadeOut: 0,
        })
      ).toThrow();
    });

    it("should reject originalVolume outside 0-1 range", () => {
      expect(() =>
        MixAudioActionSchema.parse({
          action: "mix_audio",
          volume: 0.5,
          originalVolume: -0.5,
          fadeIn: 0,
          fadeOut: 0,
        })
      ).toThrow();
    });
  });

  describe("ApplyEffectActionSchema", () => {
    it("should validate a valid effect action", () => {
      const result = ApplyEffectActionSchema.parse({
        action: "apply_effect",
        type: "vignette",
        intensity: 0.7,
      });
      expect(result.action).toBe("apply_effect");
      expect(result.type).toBe("vignette");
      expect(result.intensity).toBe(0.7);
    });

    it("should accept all valid effect types", () => {
      const types = ["vignette", "zoom_in", "zoom_out", "blur", "sharpen", "sepia", "bw", "glitch", "glow"];
      for (const type of types) {
        const result = ApplyEffectActionSchema.parse({
          action: "apply_effect",
          type,
          intensity: 0.5,
        });
        expect(result.type).toBe(type);
      }
    });
  });

  describe("SetSpeedActionSchema", () => {
    it("should validate a valid speed action", () => {
      const result = SetSpeedActionSchema.parse({
        action: "set_speed",
        rate: 2.0,
        preservePitch: true,
      });
      expect(result.action).toBe("set_speed");
      expect(result.rate).toBe(2.0);
      expect(result.preservePitch).toBe(true);
    });

    it("should reject rate outside 0.25-4.0 range", () => {
      expect(() =>
        SetSpeedActionSchema.parse({
          action: "set_speed",
          rate: 5.0,
          preservePitch: true,
        })
      ).toThrow();
    });
  });

  describe("AddOverlayActionSchema", () => {
    it("should validate a valid overlay action", () => {
      const result = AddOverlayActionSchema.parse({
        action: "add_overlay",
        assetKey: "logo.png",
        x: 50,
        y: 50,
        scale: 1.0,
        opacity: 0.8,
      });
      expect(result.action).toBe("add_overlay");
      expect(result.assetKey).toBe("logo.png");
    });
  });

  describe("SetTransitionActionSchema", () => {
    it("should validate a valid transition action", () => {
      const result = SetTransitionActionSchema.parse({
        action: "set_transition",
        type: "fade",
        duration: 0.5,
        position: "start",
      });
      expect(result.action).toBe("set_transition");
      expect(result.type).toBe("fade");
      expect(result.position).toBe("start");
    });
  });

  describe("AddBackgroundActionSchema", () => {
    it("should validate a valid background action", () => {
      const result = AddBackgroundActionSchema.parse({
        action: "add_background",
        color: "#FF0000",
        startTime: 0,
        endTime: 5,
      });
      expect(result.action).toBe("add_background");
      expect(result.color).toBe("#FF0000");
    });
  });

  describe("TrimActionSchema", () => {
    it("should validate a valid trim action", () => {
      const result = TrimActionSchema.parse({
        action: "trim",
        startTime: 10,
        endTime: 20,
      });
      expect(result.action).toBe("trim");
      expect(result.startTime).toBe(10);
      expect(result.endTime).toBe(20);
    });
  });

  describe("StudioActionSchema (discriminated union)", () => {
    it("should parse any valid action type", () => {
      const actions = [
        { action: "add_captions", text: "Test", start: 0, end: 5 },
        { action: "mix_audio", volume: 0.5, originalVolume: 0.8, fadeIn: 0, fadeOut: 0 },
        { action: "apply_effect", type: "vignette", intensity: 0.7 },
        { action: "set_speed", rate: 1.5, preservePitch: true },
        { action: "add_overlay", assetKey: "logo.png", x: 50, y: 50, scale: 1, opacity: 1 },
        { action: "set_transition", type: "fade", duration: 0.5, position: "start" },
        { action: "add_background", color: "#FF0000", startTime: 0, endTime: 5 },
        { action: "trim", startTime: 10, endTime: 20 },
      ];

      for (const action of actions) {
        const result = StudioActionSchema.parse(action);
        expect(result.action).toBe(action.action);
      }
    });
  });

  describe("StudioActionsArraySchema", () => {
    it("should validate a non-empty array of actions", () => {
      const result = StudioActionsArraySchema.parse([
        { action: "add_captions", text: "Test", start: 0, end: 5 },
      ]);
      expect(result).toHaveLength(1);
    });

    it("should reject empty arrays", () => {
      expect(() => StudioActionsArraySchema.parse([])).toThrow();
    });

    it("should reject arrays with more than 10 actions", () => {
      const actions = Array(11).fill({
        action: "add_captions",
        text: "Test",
        start: 0,
        end: 5,
      });
      expect(() => StudioActionsArraySchema.parse(actions)).toThrow();
    });
  });

  describe("ClarificationResponseSchema", () => {
    it("should validate a valid clarification response", () => {
      const result = ClarificationResponseSchema.parse({
        type: "clarification",
        question: "What text would you like?",
        suggestions: ["Add 'Hello'", "Add 'World'"],
      });
      expect(result.type).toBe("clarification");
      expect(result.suggestions).toHaveLength(2);
    });
  });
});
