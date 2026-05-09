"use client";

import { useContext } from "react";
import Link from "next/link";
import { CmdKContext } from "@/app/layout";
import type { Space } from "@/lib/types";

interface SidebarProps {
  counts: { inbox: number; thinking: number; wiki: number; project: number };
  spaces: Space[];
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
}

const layers = [
  { id: "inbox", href: "/inbox", label: "Inbox", glyph: "✉", countKey: "inbox" as const },
  { id: "thinking", href: "/thinking", label: "Thinking Space", glyph: "T", countKey: "thinking" as const },
  { id: "wiki", href: "/wiki", label: "Wiki", glyph: "W", countKey: "wiki" as const },
  { id: "project", href: "/project", label: "Project", glyph: "P", countKey: "project" as const },
];

const projects = [
  { id: "p1", label: "Mechanism Spec" },
  { id: "p2", label: "Essay: Proxy collapse" },
];

export function Sidebar({ counts, spaces, pathname, collapsed, onToggle }: SidebarProps) {
  const { open: openCmdK } = useContext(CmdKContext);

  if (collapsed) {
    return (
      <aside className="sidebar sidebar-rail" aria-label="Collapsed navigation">
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          &raquo;
        </button>
        <div className="rail-layers">
          {layers.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={"rail-item" + (pathname.startsWith(it.href) ? " active" : "")}
              title={it.label}
            >
              <span className="glyph">{it.glyph}</span>
            </Link>
          ))}
        </div>
        <button
          className="rail-cmdk"
          onClick={openCmdK}
          aria-label="Open command palette"
          title="Quick jump (Cmd+K)"
        >
          <kbd>&#8984;K</kbd>
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot"></span>
        <div className="brand-stack">
          <div>Athenaeum</div>
          <small>Knowledge OS</small>
        </div>
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          &laquo;
        </button>
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
