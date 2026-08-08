"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Caption,
  CaptionFont,
  CaptionPosition,
  CaptionTextStyle,
  CaptionTextAlign,
} from "@/domain/entities/caption";
import {
  CAPTION_FONTS,
  CAPTION_COLORS,
  TEXT_STYLES,
  TEXT_ALIGNMENTS,
} from "@/presentation/constants/caption";
import { TEXT_ANIMATIONS } from "@/presentation/constants/template";
import {
  Plus,
  Trash2,
  Type,
  Palette,
  MoveVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Eye,
  Paintbrush,
  Clock,
  Move,
} from "lucide-react";
import { FPS } from "@/lib/constants";
import { formatFrame } from "@/lib/format";
import { toastSuccess } from "@/lib/toast";

interface CaptionEditorProps {
  captions: Caption[];
  sceneCount: number;
  onAdd: (caption?: Partial<Caption>) => void;
  onUpdate: (id: string, updates: Partial<Caption>) => void;
  onRemove: (id: string) => void;
}

export function CaptionEditor({
  captions,
  sceneCount,
  onAdd,
  onUpdate,
  onRemove,
}: CaptionEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    captions.length > 0 ? captions[0].id : null
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#FFFFFF");

  const selected = captions.find((c) => c.id === selectedId) ?? null;

  const handleAdd = () => {
    onAdd();
    toastSuccess("Caption added");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Captions</h2>
          <p className="text-[10px] text-muted-foreground">
            {captions.length} caption{captions.length !== 1 ? "s" : ""} for this scene
          </p>
        </div>
        <Button size="sm" onClick={handleAdd} className="h-7 px-2 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {captions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Type className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              No captions yet. Click "Add" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {captions.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  selectedId === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {i + 1}: {c.text.slice(0, 15)}{c.text.length > 15 ? "..." : ""}
              </button>
            ))}
          </div>

          {selected && (
            <Card>
              <CardContent className="p-2.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    Edit Caption
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeleteId(selected.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                  {pendingDeleteId === selected.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() => {
                          onRemove(selected.id);
                          setSelectedId(captions.length > 1 ? captions.find((c) => c.id !== selected.id)?.id ?? null : null);
                          setPendingDeleteId(null);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <Input
                  value={selected.text}
                  onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
                  placeholder="Caption text..."
                  maxLength={500}
                  className="text-sm h-8"
                />

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Timing (seconds)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Start</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={(selected.startFrame / FPS).toFixed(1)}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value || "0"));
                          const startFrame = Math.round(val * FPS);
                          const endFrame = Math.max(startFrame + 1, selected.endFrame);
                          onUpdate(selected.id, { startFrame, endFrame });
                        }}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">End</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={(selected.endFrame / FPS).toFixed(1)}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value || "0"));
                          const endFrame = Math.max(selected.startFrame + 1, Math.round(val * FPS));
                          onUpdate(selected.id, { endFrame });
                        }}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFrame(selected.startFrame)} — {formatFrame(selected.endFrame)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Type className="h-3 w-3" /> Font
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(CAPTION_FONTS) as CaptionFont[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => onUpdate(selected.id, { font: f })}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                          selected.font === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {CAPTION_FONTS[f].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Size</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min={12}
                        max={120}
                        value={selected.size}
                        onChange={(e) => onUpdate(selected.id, { size: Number(e.target.value) })}
                        className="flex-1 accent-primary h-1"
                        aria-label="Caption size"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                        {selected.size}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Opacity
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selected.opacity}
                        onChange={(e) => onUpdate(selected.id, { opacity: Number(e.target.value) })}
                        className="flex-1 accent-primary h-1"
                        aria-label="Caption opacity"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                        {Math.round(selected.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Color
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {CAPTION_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => onUpdate(selected.id, { color: c.value })}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          selected.color === c.value
                            ? "border-primary scale-110"
                            : "border-muted-foreground/20 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        onUpdate(selected.id, { color: e.target.value });
                      }}
                      className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 cursor-pointer"
                      title="Custom color"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Move className="h-3 w-3" /> Position (drag on preview)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground">X: {Math.round(selected.x ?? 50)}%</span>
                      <input
                        type="range"
                        min={5}
                        max={95}
                        value={selected.x ?? 50}
                        onChange={(e) => onUpdate(selected.id, { x: Number(e.target.value) })}
                        className="w-full accent-primary h-1"
                        aria-label="Caption horizontal position"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Y: {Math.round(selected.y ?? 50)}%</span>
                      <input
                        type="range"
                        min={5}
                        max={95}
                        value={selected.y ?? 50}
                        onChange={(e) => onUpdate(selected.id, { y: Number(e.target.value) })}
                        className="w-full accent-primary h-1"
                        aria-label="Caption vertical position"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {(["top", "center", "bottom"] as CaptionPosition[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          const posMap: Record<string, { x: number; y: number }> = { top: { x: 50, y: 15 }, center: { x: 50, y: 50 }, bottom: { x: 50, y: 85 }, left: { x: 15, y: 50 }, right: { x: 85, y: 50 } };
                          onUpdate(selected.id, { position: p, ...posMap[p] });
                        }}
                        className={`flex-1 px-1.5 py-1 rounded text-[10px] capitalize transition-colors ${
                          selected.position === p
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Alignment</label>
                  <div className="flex gap-1">
                    {TEXT_ALIGNMENTS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onUpdate(selected.id, { textAlign: a.id })}
                        className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10px] transition-colors ${
                          selected.textAlign === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {a.id === "left" && <AlignLeft className="h-3 w-3" />}
                        {a.id === "center" && <AlignCenter className="h-3 w-3" />}
                        {a.id === "right" && <AlignRight className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Bold className="h-3 w-3" /> Text Style
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {TEXT_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onUpdate(selected.id, { textStyle: s.id })}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                          selected.textStyle === s.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <Paintbrush className="h-3 w-3" /> Animation
                  </label>
                  <div className="flex gap-1">
                    {TEXT_ANIMATIONS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onUpdate(selected.id, { animation: a.id })}
                        className={`flex-1 px-1.5 py-1 rounded text-[10px] capitalize transition-colors ${
                          selected.animation === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase">Background</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdate(selected.id, { backgroundEnabled: !selected.backgroundEnabled })
                      }
                      className={`w-8 h-5 rounded-full transition-colors ${
                        selected.backgroundEnabled ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          selected.backgroundEnabled ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    {selected.backgroundEnabled && (
                      <input
                        type="color"
                        value={selected.backgroundColor}
                        onChange={(e) => onUpdate(selected.id, { backgroundColor: e.target.value })}
                        className="w-5 h-5 rounded border-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Stroke</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.5}
                        value={selected.strokeWidth}
                        onChange={(e) => onUpdate(selected.id, { strokeWidth: Number(e.target.value) })}
                        className="flex-1 accent-primary h-1"
                        aria-label="Caption stroke width"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">
                        {selected.strokeWidth}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Shadow</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={1}
                        value={selected.shadowRadius}
                        onChange={(e) => onUpdate(selected.id, { shadowRadius: Number(e.target.value) })}
                        className="flex-1 accent-primary h-1"
                        aria-label="Caption shadow radius"
                      />
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">
                        {selected.shadowRadius}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t">
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">
                    Preview
                  </label>
                  <div
                    className="relative rounded-lg border bg-black/80 p-3 min-h-[60px] flex items-center justify-center overflow-hidden"
                    style={{
                      fontFamily: CAPTION_FONTS[selected.font].cssFamily,
                      fontSize: `${Math.min(selected.size, 36)}px`,
                      color: selected.color,
                      opacity: selected.opacity,
                      textAlign: selected.textAlign,
                      fontWeight: selected.textStyle === "bold" ? "bold" : "normal",
                      WebkitTextStroke:
                        selected.textStyle === "outlined" || selected.strokeWidth > 0
                          ? `${selected.strokeWidth || 1}px ${selected.color === "#000000" ? "#FFFFFF" : "#000000"}`
                          : undefined,
                      textShadow:
                        selected.textStyle === "shadow" || selected.shadowRadius > 0
                          ? `0 0 ${selected.shadowRadius || 8}px ${selected.color}`
                          : selected.textStyle === "neon"
                          ? `0 0 10px ${selected.color}, 0 0 20px ${selected.color}, 0 0 40px ${selected.color}`
                          : undefined,
                      backgroundColor: selected.backgroundEnabled ? selected.backgroundColor : "transparent",
                      borderRadius: "4px",
                    }}
                  >
                    {selected.text}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
