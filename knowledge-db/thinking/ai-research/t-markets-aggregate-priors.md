---
id: t-markets-aggregate-priors
type: thought
status: developing
created: 2026-04-23T11:00:00Z
updated: 2026-04-25T09:20:00Z
spaces:
  - ai-research
  - economics
edges:
  - to: m-proxy-not-target
    kind: extends
tags: []
---
# Markets and language models both aggregate priors

Markets aggregate dispersed information into prices. Language models aggregate dispersed text into probability distributions. Both are mechanisms for surfacing collective knowledge — but they diverge on feedback.

Markets have real-time feedback loops: prices move, bets resolve, participants update. LLMs have training-time feedback only: the model learns from a static corpus, and post-deployment feedback (RLHF, user interactions) is comparatively sparse and delayed.

This asymmetry matters for the proxy-target question. Markets self-correct (imperfectly) because the feedback loop connects the proxy (price) back to the target (value). LLMs don't have an equivalent mechanism — the proxy (predicted next token) has no built-in path back to the target (truth, helpfulness, safety).
