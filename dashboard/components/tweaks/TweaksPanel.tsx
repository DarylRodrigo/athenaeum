"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import "@/app/tweaks.css";

// ── Sub-components ──────────────────────────────────────────────────────────

function TweakRow({
  label,
  value,
  children,
  inline = false,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "twk-row twk-row-h" : "twk-row"}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function TweakRadio({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const n = options.length;

  const valueRef = useRef(value);
  valueRef.current = value;

  const segAt = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const r = trackRef.current.getBoundingClientRect();
      const inner = r.width - 4;
      const i = Math.floor(((clientX - r.left - 2) / inner) * n);
      return options[Math.max(0, Math.min(n - 1, i))].value;
    },
    [n, options, value]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      const v0 = segAt(e.clientX);
      if (v0 !== valueRef.current) onChange(v0);
      const move = (ev: PointerEvent) => {
        if (!trackRef.current) return;
        const v = segAt(ev.clientX);
        if (v !== valueRef.current) onChange(v);
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [segAt, onChange]
  );

  return (
    <TweakRow label={label}>
      <div
        ref={trackRef}
        role="radiogroup"
        onPointerDown={onPointerDown}
        className={dragging ? "twk-seg dragging" : "twk-seg"}
      >
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
          >
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <TweakRow label={label}>
      <select
        className="twk-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </TweakRow>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

interface TweaksPanelProps {
  tweaks: {
    aesthetic: string;
    density: string;
    accent: string;
  };
  setTweak: (key: string, value: string) => void;
}

export function TweaksPanel({ tweaks, setTweak }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + "px";
    panel.style.bottom = offsetRef.current.y + "px";
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", clampToViewport);
      return () => window.removeEventListener("resize", clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      const panel = dragRef.current;
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const startRight = window.innerWidth - r.right;
      const startBottom = window.innerHeight - r.bottom;
      const move = (ev: MouseEvent) => {
        offsetRef.current = {
          x: startRight - (ev.clientX - sx),
          y: startBottom - (ev.clientY - sy),
        };
        clampToViewport();
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [clampToViewport]
  );

  if (!open) {
    return (
      <button
        className="twk-fab"
        onClick={() => setOpen(true)}
        aria-label="Open tweaks"
      >
        &#9881;
      </button>
    );
  }

  return (
    <div
      ref={dragRef}
      className="twk-panel"
      style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
    >
      <div className="twk-hd" onMouseDown={onDragStart}>
        <b>Tweaks</b>
        <button
          className="twk-x"
          aria-label="Close tweaks"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
        >
          &#x2715;
        </button>
      </div>
      <div className="twk-body">
        <div className="twk-sect">Aesthetic</div>
        <TweakRadio
          label="Aesthetic"
          value={tweaks.aesthetic}
          onChange={(v) => setTweak("aesthetic", v)}
          options={[
            { value: "warm", label: "Warm paper" },
            { value: "cool", label: "Cool gray" },
            { value: "mono", label: "Monospace" },
          ]}
        />

        <div className="twk-sect">Density</div>
        <TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "spacious", label: "Spacious" },
            { value: "balanced", label: "Balanced" },
            { value: "dense", label: "Dense" },
          ]}
        />

        <div className="twk-sect">Accent</div>
        <TweakSelect
          label="Accent"
          value={tweaks.accent}
          onChange={(v) => setTweak("accent", v)}
          options={[
            { value: "oxblood", label: "Oxblood" },
            { value: "ink", label: "Ink black" },
            { value: "forest", label: "Forest" },
            { value: "cobalt", label: "Cobalt" },
            { value: "umber", label: "Umber" },
          ]}
        />
      </div>
    </div>
  );
}
