---
id: s-anthropic-cai
type: source
kind: paper
url: https://arxiv.org/abs/2212.08073
authors:
  - Yuntao Bai
  - Saurav Kadavath
  - Sandipan Kundu
ingested_at: 2026-04-22T08:00:00Z
created: 2026-04-22T08:00:00Z
spaces:
  - ai-research
edges: []
tags: []
---
# Constitutional AI: Harmlessness from AI Feedback

Bai et al. (2022). Proposes training AI systems using a written "constitution" — a set of principles that the model evaluates its own outputs against. This replaces some of the human feedback in RLHF with AI self-evaluation guided by explicit principles.

Key insight for proxy analysis: the constitution makes the proxy specification legible. You can read what the system is optimizing for, unlike a black-box reward model.
