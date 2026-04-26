// Sample data for Knowledge OS
const DATA = {
  inbox: [
    { id: 'i1', when: '11:42', source: 'Twitter', kind: 'tw', body: 'Goodhart\'s Law applies to RLHF reward models too — the proxy becomes the target the moment you optimize against it.', meta: '@kanjun · 2 replies', suggest: { space: 'AI Research', icon: 'A' } },
    { id: 'i2', when: '10:17', source: 'arXiv', kind: 'pa', body: 'Scaling Laws for Reward Model Overoptimization (Gao, Schulman, Hilton 2022)', meta: 'arxiv.org/2210.10760 · 31 pages', suggest: { space: 'AI Research', icon: 'A' } },
    { id: 'i3', when: '09:30', source: 'Voice', kind: 'vo', body: 'If markets are information aggregators, what does it mean that LLMs are trained on the consensus of internet text? Are they aggregating priors or eroding them?', meta: 'Voice memo · 47s', suggest: { space: 'Philosophy', icon: 'P' } },
    { id: 'i4', when: 'Yest', source: 'Substack', kind: 'ar', body: 'Cowen on the political economy of AI safety regulation — who benefits from licensing regimes?', meta: 'Marginal Revolution · 14 min read', suggest: { space: 'Economics', icon: 'E' } },
    { id: 'i5', when: 'Yest', source: 'Doc', kind: 'do', body: 'Notes from "Seeing Like a State", ch. 3 — legibility as a precondition for control. Connects to alignment debates.', meta: 'Reading Space · Scott', suggest: { space: 'Reading: Scott', icon: 'R' } },
    { id: 'i6', when: 'Mon', source: 'Tweet', kind: 'tw', body: 'The most expensive coordination failures are usually the ones where everyone individually behaves rationally.', meta: 'Saved · no author', suggest: { space: 'Economics', icon: 'E' } },
    { id: 'i7', when: 'Mon', source: 'Podcast', kind: 'po', body: 'Tyler Cowen w/ Patrick Collison — on why scientific output may be slowing despite more researchers.', meta: 'Conversations · 1h12m', suggest: { space: 'Economics', icon: 'E' } },
    { id: 'i8', when: 'Sun', source: 'Note', kind: 'no', body: 'Open question: is there a Goodhart-equivalent for credentialing systems? The diploma was a proxy; now the proxy IS the qualification.', meta: 'Quick capture', suggest: { space: 'Philosophy', icon: 'P' } },
    { id: 'i9', when: 'Sun', source: 'Paper', kind: 'pa', body: 'Constitutional AI: Harmlessness from AI Feedback', meta: 'arxiv · skim', suggest: { space: 'AI Research', icon: 'A' } },
    { id: 'i10', when: 'Sat', source: 'Doc', kind: 'do', body: 'Watched documentary on Bell Labs — the role of long horizons in producing breakthrough research.', meta: 'Documentary notes', suggest: { space: 'Economics', icon: 'E' } },
  ],

  thoughts: [
    { id: 't1', title: 'Goodhart\'s Law as a universal constraint on designed systems', age: '14d', sources: 6, edges: 9, space: 'Philosophy', active: true },
    { id: 't2', title: 'RLHF reward hacking is not an alignment failure — it\'s a measurement failure', age: '6d', sources: 4, edges: 5, space: 'AI Research' },
    { id: 't3', title: 'Markets and language models both aggregate priors. They diverge on feedback.', age: '3d', sources: 3, edges: 4, space: 'Meta' },
    { id: 't4', title: 'Legibility is a precondition for both control and care', age: '21d', sources: 5, edges: 7, space: 'Philosophy' },
    { id: 't5', title: 'The proxy-target collapse is faster in tight feedback loops', age: '2d', sources: 2, edges: 3, space: 'Economics' },
  ],

  wikiArticles: [
    { id: 'w1', title: 'Goodhart\'s Law', section: 'Concepts' },
    { id: 'w2', title: 'Reward Model Overoptimization', section: 'Concepts', indent: true },
    { id: 'w3', title: 'Proxy–Target Collapse', section: 'Concepts', indent: true, current: true },
    { id: 'w4', title: 'Legibility (Scott)', section: 'Concepts' },
    { id: 'w5', title: 'Information Aggregation', section: 'Concepts' },
    { id: 'w6', title: 'Constitutional AI', section: 'Methods' },
    { id: 'w7', title: 'RLHF', section: 'Methods' },
    { id: 'w8', title: 'Mechanism Design', section: 'Frameworks' },
    { id: 'w9', title: 'On bridging principles', section: 'Meta-essays' },
  ],

  tasks: [
    { id: 'k1', title: 'Draft v0 mechanism spec — incentive layer', when: 'Apr 28', who: 'self', done: false },
    { id: 'k2', title: 'Read Hurwicz + Maskin survey on mechanism design', when: 'Apr 30', who: 'self', done: false },
    { id: 'k3', title: 'Sketch contract for honest reporting → escrow flow', when: 'May 02', who: 'self', done: false },
    { id: 'k4', title: 'Map graph of incentive primitives', when: 'Apr 22', who: 'self', done: true },
    { id: 'k5', title: 'Outline why existing RLHF \u2260 mechanism design', when: 'Apr 18', who: 'self', done: true },
  ],
};

window.DATA = DATA;
