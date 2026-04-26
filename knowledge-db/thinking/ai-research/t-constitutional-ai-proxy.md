---
id: t-constitutional-ai-proxy
type: thought
status: drafting
created: 2026-04-22T08:15:00Z
updated: 2026-04-22T08:15:00Z
spaces:
  - ai-research
edges:
  - to: t-rlhf-reward-hacking
    kind: extends
  - to: s-anthropic-cai
    kind: supported_by
tags: []
---
# Constitutional AI as proxy specification

Constitutional AI (Bai et al.) is interesting not because it solves the proxy problem, but because it makes the proxy explicit. The "constitution" is a written specification of what the proxy should optimize for — a set of principles that replace the implicit preferences encoded in RLHF reward models.

This doesn't eliminate the proxy-target gap, but it does make it legible. You can read the constitution and reason about where it might diverge from actual human values. That's a step forward from RLHF, where the proxy is a black-box neural network trained on pairwise comparisons.
