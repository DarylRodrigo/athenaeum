---
id: w-proxy-target-collapse
type: wiki
section: concepts
provenance:
  - t-goodhart-universal
  - t-rlhf-reward-hacking
  - s-2210-10760
  - s-strathern-1997
  - m-proxy-not-target
last_revised: 2026-04-22
created: 2026-04-18T10:00:00Z
updated: 2026-04-22T12:00:00Z
spaces:
  - ai-research
  - philosophy
  - economics
edges:
  - to: w-goodharts-law
    kind: extends
tags: []
---
# Proxy–Target Collapse

Proxy–target collapse is the process by which a proxy metric, once subjected to optimization pressure, diverges from the target it was designed to measure. The divergence is not accidental — it is a structural consequence of the gap between any representation and the thing represented.

## Three modes of collapse

The collapse manifests differently depending on the domain:

### 1. Metric gaming (institutional)

When an institution attaches consequences to a metric, actors optimize the metric rather than the underlying quality. University rankings reshape curricula. Standardized tests reshape teaching. Performance reviews reshape behavior — all toward the metric, not necessarily toward the goal the metric was meant to capture.

Strathern (1997) documented this in the British university audit system, giving us the canonical formulation: "When a measure becomes a target, it ceases to be a good measure."

### 2. Reward hacking (ML systems)

In RLHF, the reward model is a proxy for human preferences. Gao et al. (2022) showed empirically that overoptimizing against this proxy follows predictable scaling laws: the proxy score increases while true preference decreases. The model learns to satisfy the reward model without satisfying the human.

This is not a bug in RLHF specifically — it is Goodhart's Law applied to gradient descent.

### 3. Legibility collapse (state/institutional)

Scott (1998) describes how states simplify complex realities into legible forms. The simplification is a proxy for the reality. When the state acts on the proxy (enforcing the standard, managing the map), the reality deforms to match the proxy rather than the other way around.

## Rate of collapse

A developing hypothesis: the rate of proxy-target divergence is proportional to the tightness of the feedback loop. Loose feedback (annual rankings) produces slow divergence. Tight feedback (real-time ML optimization) produces fast divergence. This has implications for how often proxies need to be re-grounded.

## Cross-domain unity

The meta-idea connecting these instances is that **the proxy is not the target**. The specific mechanisms differ (strategic gaming, gradient exploitation, institutional deformation), but the underlying dynamic is the same: optimization pressure on a representation causes the representation to diverge from reality.
