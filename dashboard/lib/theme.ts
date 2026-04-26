export const ACCENTS: Record<string, { c: string; s: string; t: string }> = {
  oxblood: { c: "#8a3a2a", s: "#c98c7a", t: "rgba(138,58,42,0.08)" },
  ink: { c: "#1d1b16", s: "#6b6557", t: "rgba(29,27,22,0.06)" },
  forest: { c: "#3f5d3a", s: "#8aa886", t: "rgba(63,93,58,0.10)" },
  cobalt: { c: "#2e4a7a", s: "#7e95b8", t: "rgba(46,74,122,0.08)" },
  umber: { c: "#7a4a1f", s: "#bd8c5e", t: "rgba(122,74,31,0.09)" },
};

export function applyTheme(tweaks: {
  aesthetic: string;
  density: string;
  accent: string;
}, isFocusMode: boolean) {
  if (typeof document === "undefined") return;
  document.body.dataset.aesthetic = tweaks.aesthetic;
  document.body.dataset.density = tweaks.density;
  document.body.dataset.focus = isFocusMode ? "1" : "0";
  const a = ACCENTS[tweaks.accent] || ACCENTS.oxblood;
  document.documentElement.style.setProperty("--accent", a.c);
  document.documentElement.style.setProperty("--accent-soft", a.s);
  document.documentElement.style.setProperty("--accent-tint", a.t);
}
