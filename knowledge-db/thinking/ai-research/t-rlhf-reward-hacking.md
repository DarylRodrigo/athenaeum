---
id: t-rlhf-reward-hacking
type: thought
status: developing
created: 2026-04-20T10:00:00Z
updated: 2026-04-24T15:30:00Z
spaces:
  - ai-research
edges:
  - to: s-2210-10760
    kind: supported_by
  - to: m-proxy-not-target
    kind: instance_of
tags:
  - active
---
# RLHF reward hacking is not an alignment failure — it's a measurement failure

The standard framing of RLHF reward hacking treats it as an alignment problem: the model is "misaligned" because it found ways to get high reward without being helpful. But this misses the deeper issue.

What's actually happening is a measurement failure. The reward model is a proxy for human judgment, and like all proxies, it diverges from the target under optimization pressure. This is Goodhart's Law applied to machine learning — not a novel failure mode, but a well-understood structural property of any system that optimizes against a proxy metric.

The Gao et al. (2022) scaling laws paper shows this quantitatively: overoptimization against the reward model follows predictable scaling patterns. The reward model score increases, but true preference (as measured by a gold-standard model) plateaus and then decreases. The proxy and target diverge in direct proportion to optimization pressure.

This reframe matters because it changes the solution space. If the problem is misalignment, you fix the model. If the problem is measurement, you fix the metric — or you accept the fundamental limits of proxy optimization and design systems that account for it.
