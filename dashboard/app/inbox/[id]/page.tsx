"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { NodeDetail, Space } from "@/lib/types";
import { ThoughtEditor } from "@/components/editor/ThoughtEditor";

const SOURCE_LABELS: Record<string, string> = {
  twitter: "Twitter", arxiv: "arXiv", voice: "Voice", substack: "Substack",
  doc: "Doc", tweet: "Tweet", podcast: "Podcast", note: "Note", paper: "Paper",
  test: "Test", cli: "CLI", agent: "Agent",
};

function fullTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString([], { dateStyle: "long", timeStyle: "short" });
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function bodyWithoutTitle(body: string): string {
  return body.replace(/^#\s+.+\n+/, "").trim();
}

interface Draft {
  body: string;
  space: string;
}

export default function InboxDigestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<NodeDetail | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Initial load: fetch item + spaces, seed one empty draft.
  useEffect(() => {
    apiFetch<NodeDetail>(`/inbox/${id}`)
      .then(setItem)
      .catch(() => setNotFound(true));
    apiFetch<Space[]>("/spaces")
      .then((s) => {
        setSpaces(s);
        if (s.length > 0) {
          setDrafts([{ body: "", space: s[0].id }]);
        }
      })
      .catch(() => {});
  }, [id]);

  const updateDraft = (idx: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addDraft = () => {
    setDrafts((prev) => {
      const lastSpace = prev[prev.length - 1]?.space || spaces[0]?.id || "";
      return [...prev, { body: "", space: lastSpace }];
    });
  };

  const removeDraft = (idx: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  async function develop() {
    const filled = drafts.filter((d) => d.body.trim().length > 0);
    if (filled.length === 0) {
      setError("Write at least one thought, or archive without thought.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/inbox/${id}/develop`, {
        method: "POST",
        body: JSON.stringify({
          thoughts: filled.map((d) => ({ space: d.space, body: d.body })),
        }),
      });
      router.push("/thinking");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`develop failed: ${msg}`);
      setBusy(false);
    }
  }

  async function archive() {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/inbox/${id}`, { method: "DELETE" });
      router.push("/inbox");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`archive failed: ${msg}`);
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="page digest-page">
        <p style={{ padding: 48, color: "var(--ink-3)" }}>
          Inbox item not found. <Link href="/inbox">← back to inbox</Link>
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page digest-page">
        <p style={{ padding: 48, color: "var(--ink-3)", fontStyle: "italic" }}>Loading…</p>
      </div>
    );
  }

  const sourceKey = item.source || id.split("-").pop() || "";
  const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey;
  const cleanBody = bodyWithoutTitle(item.body || "");
  const filledCount = drafts.filter((d) => d.body.trim().length > 0).length;

  return (
    <div className="page digest-page">
      <div className="digest-back">
        <Link href="/inbox">← back to inbox</Link>
      </div>

      <article className="digest-source">
        <div className="digest-meta">
          <span className="digest-source-label">{sourceLabel}</span>
          <span className="digest-dot">·</span>
          <span>captured {fullTimestamp(item.captured_at || item.created)}</span>
          {item.tags && item.tags.length > 0 && (
            <>
              <span className="digest-dot">·</span>
              <span>tags: {item.tags.join(", ")}</span>
            </>
          )}
        </div>

        <h1 className="digest-title">{item.title}</h1>

        {item.raw_url && (
          <a
            className="digest-raw-url"
            href={item.raw_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ open original on {hostname(item.raw_url)}
          </a>
        )}

        <div className="digest-body">
          {cleanBody ? (
            <p>{cleanBody}</p>
          ) : (
            <p style={{ color: "var(--ink-4)", fontStyle: "italic" }}>(no body — title only)</p>
          )}
        </div>
      </article>

      <div className="digest-divider">
        <span>What does this spark?</span>
      </div>

      <div className="thoughts-stack">
        {drafts.map((d, idx) => (
          <div key={idx} className="thought-card">
            {drafts.length > 1 && (
              <button
                className="thought-remove"
                aria-label="Remove this thought"
                onClick={() => removeDraft(idx)}
                disabled={busy}
                title="Remove this thought"
              >
                ×
              </button>
            )}

            <ThoughtEditor
              value={d.body}
              onChange={(md) => updateDraft(idx, { body: md })}
              placeholder={
                idx === 0
                  ? "Write your thought. The first line becomes its title."
                  : "Another thought from this capture…"
              }
              autoFocus={idx === 0}
              disabled={busy}
            />

            <div className="thought-card-footer">
              <span className="footer-label">→ space</span>
              <div className="space-pills">
                {spaces.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={"space-pill" + (d.space === s.id ? " on" : "")}
                    onClick={() => updateDraft(idx, { space: s.id })}
                    disabled={busy}
                    style={d.space === s.id ? { color: s.accent } : undefined}
                  >
                    <span className="dot" style={{ background: s.accent }}></span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          className="add-thought"
          onClick={addDraft}
          disabled={busy}
        >
          + another thought
        </button>
      </div>

      {error && <div className="digest-error">{error}</div>}

      <div className="digest-actions-sticky">
        <button
          className="btn primary"
          onClick={develop}
          disabled={busy || filledCount === 0}
        >
          {busy ? "Saving…" : `Develop ${filledCount || ""} thought${filledCount === 1 ? "" : "s"}`.trim()}
        </button>
        <button
          className="btn ghost"
          onClick={archive}
          disabled={busy}
        >
          Archive without thought
        </button>
      </div>
    </div>
  );
}
