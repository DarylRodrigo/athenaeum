---
id: t-goodhart-universal
type: thought
status: mature
created: 2026-04-12T09:30:00Z
updated: 2026-04-26T14:22:00Z
spaces:
  - philosophy
  - ai-research
  - economics
edges:
  - to: s-strathern-1997
    kind: supported_by
  - to: t-rlhf-reward-hacking
    kind: extends
  - to: m-proxy-not-target
    kind: supports
tags:
  - ready-to-graduate
---
# Goodhart's Law as a universal constraint on designed systems

Goodhart's Law ("When a measure becomes a target, it ceases to be a good measure") is usually cited as a warning about metrics. But the deeper reading is that it describes a structural property of any system where a proxy is optimized as if it were the real target.

This isn't a bug in specific systems — it's a consequence of the gap between any representation and the thing represented. Strathern (1997) generalized it: every audit regime, every evaluation framework, every reward signal is a proxy. The moment you attach consequences to the proxy, actors (human or artificial) begin optimizing the proxy rather than the target.

Three domains where this plays out with different dynamics:
1. **AI alignment** — reward models as proxies for human preferences (see: RLHF reward hacking)
2. **Institutional design** — university rankings, standardized testing, performance reviews
3. **Markets** — prices as proxies for value, credit ratings as proxies for creditworthiness

The question is not whether the proxy will diverge from the target (it will), but how fast, under what conditions, and whether the system has mechanisms for detecting and correcting the divergence.
