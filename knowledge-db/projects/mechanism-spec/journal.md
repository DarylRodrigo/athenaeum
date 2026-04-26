## 2026-04-26 — SUN

### API test entry

This entry was added via the API.

## 2026-04-24 — THU

### Reframing what this project actually is

Spent the morning re-reading Hurwicz and Maskin's implementation theory survey. The framing isn't "build a better RLHF" — it's "what does a feedback mechanism look like if you assume the model is strategic?"

This reframes the entire project. We're not improving a training pipeline. We're designing an institution — a set of rules that produce good outcomes even when participants (models, labelers, deployers) act in self-interest.

The *Proxy–Target Collapse* wiki article helped crystallize this. The three modes of collapse (metric gaming, reward hacking, legibility collapse) are all instances of the same failure: the mechanism isn't incentive-compatible.

## 2026-04-22 — TUE

### What the v0 needs to demonstrate

Three things:
1. A simple escrow-based reporting mechanism where the model stakes something on its answer
2. A verification game where other models can challenge the answer
3. A scoring rule that makes honest reporting the dominant strategy

The key reference is the VCG mechanism from Hurwicz — truth-telling is a dominant strategy when the mechanism is designed correctly.

## 2026-04-18 — FRI

### Day-one notes

Starting this project because the connection between mechanism design and RLHF keeps coming up in the thinking space. There's a real paper here — not just an observation, but a constructive proposal.

Initial reading list: Hurwicz + Maskin survey, Myerson's optimal auction design, the Gao et al. scaling laws paper (for the RLHF failure data).
