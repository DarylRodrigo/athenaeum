export interface Edge {
  to: string;
  kind: string;
  note?: string;
}

export interface NodeSummary {
  id: string;
  type: string;
  title: string;
  spaces: string[];
  created: string | null;
  updated: string | null;
  edge_count: number;
  tags: string[];
  section?: string;
  source?: string;
  raw_url?: string;
}

export interface NodeDetail extends NodeSummary {
  body: string;
  edges: Edge[];
  // Type-specific fields
  status?: string;
  kind?: string;
  url?: string;
  authors?: string[];
  source?: string;
  captured_at?: string;
  raw_url?: string;
  provenance?: string[];
  last_revised?: string;
  goals?: string;
  spans?: string[];
}

export interface Space {
  id: string;
  label: string;
  accent: string;
}

export interface JournalEntry {
  date: string;
  day: string;
  body: string;
}

export interface Task {
  title: string;
  done: boolean;
  when: string | null;
}

export interface ProjectDetail extends NodeDetail {
  journal: JournalEntry[];
  tasks: Task[];
}

export interface StatusResponse {
  counts: {
    inbox: number;
    thinking: number;
    sources: number;
    wiki: number;
    projects: number;
  };
  last_commit: {
    hash: string;
    message: string;
    author: string;
    at: string;
  } | null;
}
