import { apiFetch } from "@/lib/api";

export type GraphSpace = "ai" | "econ" | "phil" | "meta" | "other";
export type GraphNodeType = "thought" | "source" | "meta";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  space: GraphSpace;
  title: string;
  degree: number;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: string;
  src: "you" | "llm";
  cross: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface ApiNode {
  type: string;
  spaces?: string[];
  title?: string;
  outbound?: { to: string; kind: string }[];
  inbound?: { from: string; kind: string }[];
}

interface ApiGraph {
  version: number;
  nodes: Record<string, ApiNode>;
}

const SPACE_FROM_API: Record<string, GraphSpace> = {
  "ai-research": "ai",
  "economics": "econ",
  "philosophy": "phil",
  "meta": "meta",
};

function normalizeSpace(spaces: string[] | undefined): GraphSpace {
  if (!spaces || spaces.length === 0) return "other";
  return SPACE_FROM_API[spaces[0]] || "other";
}

function normalizeType(t: string): GraphNodeType {
  if (t === "thought") return "thought";
  if (t === "meta") return "meta";
  return "source";
}

// LLM-suggested edges aren't yet flagged in the API — assume "you" for now.
// The shape leaves room to flip this once the backend marks them.
function edgeSrc(_kind: string): "you" | "llm" {
  return "you";
}

export function reshape(api: ApiGraph): GraphData {
  const ids = new Set(Object.keys(api.nodes));

  const nodes: GraphNode[] = Object.entries(api.nodes).map(([id, n]) => {
    const out = n.outbound?.length || 0;
    const inb = n.inbound?.length || 0;
    return {
      id,
      type: normalizeType(n.type),
      space: normalizeSpace(n.spaces),
      title: n.title || id,
      degree: out + inb,
    };
  });

  // Dedupe links by stable key — outbound from one node and inbound on the
  // other describe the same edge.
  const seen = new Set<string>();
  const links: GraphLink[] = [];
  for (const [id, n] of Object.entries(api.nodes)) {
    for (const e of n.outbound || []) {
      if (!ids.has(e.to)) continue; // skip dangling edges
      const key = `${id}→${e.to}::${e.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fromNode = api.nodes[id];
      const toNode = api.nodes[e.to];
      const cross =
        normalizeSpace(fromNode?.spaces) !== normalizeSpace(toNode?.spaces);
      links.push({
        source: id,
        target: e.to,
        kind: e.kind,
        src: edgeSrc(e.kind),
        cross,
      });
    }
  }

  return { nodes, links };
}

export async function fetchGraph(): Promise<GraphData> {
  const api = await apiFetch<ApiGraph>("/graph");
  return reshape(api);
}

export const SPACE_COLOR: Record<GraphSpace, string> = {
  ai: "oklch(0.62 0.13 28)",
  econ: "oklch(0.55 0.10 145)",
  phil: "oklch(0.50 0.11 270)",
  meta: "oklch(0.45 0.18 25)", // matches --accent (oxblood) approximately
  other: "oklch(0.55 0.02 80)",
};

export const SPACE_LABEL: Record<GraphSpace, string> = {
  ai: "AI Research",
  econ: "Economics",
  phil: "Philosophy",
  meta: "Meta",
  other: "Other",
};
