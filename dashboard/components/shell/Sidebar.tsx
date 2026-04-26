"use client";

import { useContext } from "react";
import Link from "next/link";
import { CmdKContext } from "@/app/layout";
import type { Space } from "@/lib/types";

interface SidebarProps {
  counts: { inbox: number; thinking: number; wiki: number; project: number };
  spaces: Space[];
  pathname: string;
}

const layers = [
  { id: "inbox", href: "/inbox", label: "Inbox", glyph: "\u2709", countKey: "inbox" as const },
  { id: "thinking", href: "/thinking", label: "Thinking Space", glyph: "T", countKey: "thinking" as const },
  { id: "wiki", href: "/wiki", label: "Wiki", glyph: "W", countKey: "wiki" as const },
  { id: "project", href: "/project", label: "Project", glyph: "P", countKey: "project" as const },
];

const projects = [
  { id: "p1", label: "Mechanism Spec" },
  { id: "p2", label: "Essay: Proxy collapse" },
];

export function Sidebar({ counts, spaces, pathname }: SidebarProps) {
  const { open: openCmdK } = useContext(CmdKContext);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot"></span>
        <div className="brand-stack">
          <div>Athenaeum</div>
          <small>Knowledge OS</small>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Layers</div>
        {layers.map((it) => (
          <Link
            key={it.id}
            href={it.href}
            className={"nav-item" + (pathname.startsWith(it.href) ? " active" : "")}
          >
            <span className="glyph">{it.glyph}</span>
            <span>{it.label}</span>
            {counts[it.countKey] != null && (
              <span className="count">{counts[it.countKey]}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Spaces</div>
        {spaces.map((s) => (
          <Link
            key={s.id}
            href="/thinking"
            className="nav-item"
            style={{ paddingLeft: 10 }}
          >
            <span
              className="glyph"
              style={{ color: s.accent, fontStyle: "italic" }}
            >
              &bull;
            </span>
            <span>{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Projects</div>
        {projects.map((p) => (
          <Link key={p.id} href="/project" className="nav-item">
            <span className="glyph">&sect;</span>
            <span>{p.label}</span>
          </Link>
        ))}
      </div>

      <div className="cmdk" onClick={openCmdK}>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>
          quick jump
        </span>
        <kbd>&#8984;K</kbd>
      </div>
    </aside>
  );
}
