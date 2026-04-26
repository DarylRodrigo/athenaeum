"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CmdItem {
  id: string;
  name: string;
  glyph: string;
  hint?: string;
  kind: string;
  where?: string;
  target?: string;
}

interface CmdGroup {
  label: string;
  items: CmdItem[];
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQ("");
      setActive(0);
    }
  }, [open]);

  const groups: CmdGroup[] = useMemo(() => {
    const navItems: CmdItem[] = [
      { id: "inbox", name: "Go to Inbox", glyph: "\u2709", hint: "G I", kind: "layer", target: "/inbox" },
      { id: "thinking", name: "Go to Thinking Space", glyph: "T", hint: "G T", kind: "layer", target: "/thinking" },
      { id: "wiki", name: "Go to Wiki", glyph: "W", hint: "G W", kind: "layer", target: "/wiki" },
      { id: "project", name: "Go to Project", glyph: "P", hint: "G P", kind: "layer", target: "/project" },
    ];
    const docs: CmdItem[] = [
      { id: "d1", name: "Goodhart's Law as a universal constraint", glyph: "t", kind: "thought", where: "Philosophy", target: "/thinking" },
      { id: "d2", name: "RLHF reward hacking is a measurement failure", glyph: "t", kind: "thought", where: "AI Research", target: "/thinking" },
      { id: "d3", name: "Proxy\u2013Target Collapse", glyph: "w", kind: "wiki", where: "Wiki", target: "/wiki" },
      { id: "d4", name: "Legibility (Scott)", glyph: "w", kind: "wiki", where: "Wiki", target: "/wiki" },
      { id: "d5", name: "Mechanism Spec", glyph: "\u00a7", kind: "project", where: "Active", target: "/project" },
    ];
    const actions: CmdItem[] = [
      { id: "a1", name: "Capture new thought", glyph: "+", hint: "\u2318N", kind: "action" },
      { id: "a2", name: "Triage inbox", glyph: "\u2709", kind: "action", target: "/inbox" },
      { id: "a3", name: "Generate weekly digest", glyph: "D", kind: "action" },
    ];

    const filter = (arr: CmdItem[]) =>
      q ? arr.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())) : arr;

    return [
      { label: "Navigate", items: filter(navItems) },
      { label: "Open", items: filter(docs) },
      { label: "Actions", items: filter(actions) },
    ].filter((g) => g.items.length);
  }, [q]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const navigate = useCallback(
    (target?: string) => {
      if (target) router.push(target);
      onClose();
    },
    [router, onClose]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, flat.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        const item = flat[active];
        if (item) navigate(item.target);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active, flat, onClose, navigate]);

  if (!open) return null;

  let idx = -1;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input">
          <span className="glyph">&#x2315;</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to anything \u2014 pages, thoughts, articles, projects\u2026"
          />
          <span
            style={{
              fontSize: 11,
              color: "var(--ink-4)",
              fontFamily: "var(--mono)",
            }}
          >
            esc
          </span>
        </div>
        <div className="cmd-list">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="cmd-group-label">{g.label}</div>
              {g.items.map((it) => {
                idx++;
                const isActive = idx === active;
                return (
                  <div
                    key={it.id}
                    className={"cmd-row" + (isActive ? " active" : "")}
                    onClick={() => navigate(it.target)}
                  >
                    <span className="cmd-glyph">{it.glyph}</span>
                    <span className="cmd-name">{it.name}</span>
                    {it.where && (
                      <span className="cmd-where">{it.where}</span>
                    )}
                    {it.hint && <span className="cmd-hint">{it.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
