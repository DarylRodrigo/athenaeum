---
id: t-mechanism-design-not-rlhf
type: thought
status: developing
created: 2026-04-18T14:30:00Z
updated: 2026-04-23T10:00:00Z
spaces:
  - economics
  - ai-research
edges:
  - to: s-hurwicz-maskin
    kind: supported_by
  - to: m-proxy-not-target
    kind: instance_of
tags: []
---
# Mechanism design assumes adversarial participants — RLHF doesn't

Mechanism design (Hurwicz, Maskin, Myerson) assumes that participants are strategic and self-interested. The whole point of the field is to design rules such that self-interested behavior produces socially desirable outcomes. The mechanism must be incentive-compatible: telling the truth must be the best strategy.

RLHF assumes cooperative participants. The human labelers are assumed to be honestly expressing their preferences, and the model is assumed to be (once trained) faithfully implementing those preferences. There's no mechanism for handling strategic behavior on either side.

This is a fundamental architectural difference. If you take the Goodhart's Law perspective seriously — that any proxy will be gamed under optimization pressure — then the mechanism design framing is more appropriate than the cooperative learning framing. You need to design the feedback system as if the model (and possibly the labelers) will find ways to exploit it.
