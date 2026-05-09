"use client";

import { useState, useEffect, useCallback } from "react";
import { ThoughtEditor } from "@/components/editor/ThoughtEditor";
import { apiFetch } from "@/lib/api";

// Match URLs (stop at whitespace and the common trailing punctuation/brackets).
const URL_REGEX = /https?:\/\/[^\s)\]>"']+/g;

const HOSTNAME_TO_SOURCE: Record<string, string> = {
  "x.com": "twitter",
  "twitter.com": "twitter",
  "arxiv.org": "arxiv",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "github.com": "github",
  "news.ycombinator.com": "hn",
};

function detectSourceFromHost(host: string): string {
  const cleaned = host.replace(/^www\./, "");
  if (HOSTNAME_TO_SOURCE[cleaned]) return HOSTNAME_TO_SOURCE[cleaned];
  if (cleaned.endsWith(".substack.com")) return "substack";
  return "article";
}

function extractUrl(body: string): { url: string | null; host: string; source: string } {
  const matches = body.match(URL_REGEX);
  const url = matches && matches.length > 0 ? matches[0] : null;
  if (!url) return { url: null, host: "", source: "note" };
  try {
    const u = new URL(url);
    const host = u.hostname;
    return { url, host, source: detectSourceFromHost(host) };
  } catch {
    return { url, host: "", source: "note" };
  }
}

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCaptured: () => void;
}

export function QuickCaptureModal({ open, onClose, onCaptured }: QuickCaptureModalProps) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detection = extractUrl(body);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setBody("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = useCallback(async () => {
    if (!body.trim()) {
      setError("Body is empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        body,
        source: detection.source,
        kind: "no",
      };
      if (detection.url) payload.raw_url = detection.url;
      await apiFetch("/inbox", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onCaptured();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`capture failed: ${msg}`);
      setBusy(false);
    }
  }, [body, detection.source, detection.url, onCaptured, onClose]);

  // Esc to close, Cmd/Ctrl+Enter to submit.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submit, onClose]);

  if (!open) return null;

  return (
    <div className="capture-modal-backdrop" onClick={onClose}>
      <div className="capture-modal" onClick={(e) => e.stopPropagation()}>
        <div className="capture-modal-header">
          <span className="eyebrow">Quick capture</span>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close capture"
          >
            ×
          </button>
        </div>

        <div className="capture-modal-body">
          <ThoughtEditor
            value={body}
            onChange={setBody}
            placeholder="Write a capture. Paste a URL anywhere and it'll be detected."
            autoFocus
            disabled={busy}
          />
        </div>

        <div className="capture-modal-footer">
          <div className="capture-meta">
            {detection.url ? (
              <span>
                ↗ <b>{detection.source}</b>
                <span className="capture-meta-host">{detection.host.replace(/^www\./, "")}</span>
              </span>
            ) : (
              <span className="capture-meta-empty">no URL — captures as note</span>
            )}
          </div>

          {error && <div className="capture-error">{error}</div>}

          <div className="capture-modal-actions">
            <button className="btn ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={submit}
              disabled={busy || !body.trim()}
            >
              {busy ? "Capturing…" : "Capture"}
              <kbd className="capture-kbd">&#8984;↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
