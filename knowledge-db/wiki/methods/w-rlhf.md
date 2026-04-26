---
id: w-rlhf
type: wiki
section: methods
provenance:
  - t-rlhf-reward-hacking
  - s-2210-10760
last_revised: 2026-04-18
created: 2026-04-18T14:00:00Z
updated: 2026-04-18T14:00:00Z
spaces:
  - ai-research
edges: []
tags: []
---
# Reinforcement Learning from Human Feedback (RLHF)

RLHF is a training methodology for large language models that uses human preference judgments to fine-tune model behavior. The process has three stages:

1. **Supervised fine-tuning** — train on demonstration data
2. **Reward model training** — train a model to predict human preferences from pairwise comparisons
3. **RL fine-tuning** — optimize the language model against the reward model using PPO or similar

## Proxy-target dynamics

The reward model is a proxy for human preferences. Gao et al. (2022) showed that overoptimizing against this proxy produces predictable divergence: the reward model score increases while actual human preference (measured by a held-out gold-standard) peaks and then decreases.

This is the central tension of RLHF: you need a proxy to train at scale (you can't query humans for every training step), but the proxy diverges from the target under optimization pressure.

## Alternatives and extensions

- **Constitutional AI** (Bai et al., 2022) replaces some human feedback with AI self-evaluation against a written constitution
- **Direct Preference Optimization** (DPO) skips the reward model entirely, optimizing preferences directly
- **Mechanism design approaches** would frame the feedback problem as a game with strategic participants
