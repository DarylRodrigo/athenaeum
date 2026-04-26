---
id: p-mechanism-spec
type: project
status: active
created: 2026-04-18T10:00:00Z
updated: 2026-04-24T16:00:00Z
spaces:
  - economics
  - ai-research
edges:
  - to: t-mechanism-design-not-rlhf
    kind: supported_by
  - to: w-rlhf
    kind: relates_to
goals: |
  A working draft of an incentive layer for honest reporting in multi-agent systems.
  Combine mechanism design theory with insights from RLHF failure modes to design
  feedback systems that remain robust under optimization pressure.
tags: []
---
# Mechanism Spec v0

A working draft of an incentive layer for honest reporting in multi-agent systems. The hypothesis is that mechanism design theory — which assumes strategic, self-interested participants — provides a more robust framework for AI feedback than the cooperative assumption underlying RLHF.
