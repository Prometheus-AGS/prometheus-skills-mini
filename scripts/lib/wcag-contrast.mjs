#!/usr/bin/env node
// WCAG contrast helper.
//
// Exports:
//   contrastRatio(fg, bg)   → number    (1.0 - 21.0)
//   wcagLevel(ratio, large?) → "AAA" | "AA" | "A" | "FAIL"
//   report(pairs)            → [{ fg, bg, ratio, level }]
//
// Uses culori for color parsing (handles hex, rgb(), hsl(), oklch()).
// WCAG 2.1 relative luminance formula.

import { parse, converter } from "culori";

const toRgb = converter("rgb");

function relativeLuminance(rgb) {
  // rgb is in [0, 1] linear space after culori conversion; WCAG uses sRGB
  // gamma-decoded values, which is what culori's "rgb" mode returns
  // (already linearized). Apply the WCAG formula directly.
  const ch = (c) => {
    // culori's rgb space is sRGB *non-linear* (gamma-encoded) — undo gamma.
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = ch(rgb.r);
  const g = ch(rgb.g);
  const b = ch(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg, bg) {
  const fgRgb = toRgb(parse(fg));
  const bgRgb = toRgb(parse(bg));
  if (!fgRgb || !bgRgb) {
    throw new Error(`unparseable color: fg=${fg} bg=${bg}`);
  }
  const l1 = relativeLuminance(fgRgb);
  const l2 = relativeLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function wcagLevel(ratio, largeText = false) {
  const aaa = largeText ? 4.5 : 7.0;
  const aa = largeText ? 3.0 : 4.5;
  const a = largeText ? 2.0 : 3.0;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  if (ratio >= a) return "A";
  return "FAIL";
}

export function report(pairs) {
  return pairs.map(({ fg, bg, label, large }) => {
    const ratio = contrastRatio(fg, bg);
    return {
      label: label ?? `${fg} on ${bg}`,
      fg,
      bg,
      ratio: Math.round(ratio * 100) / 100,
      level: wcagLevel(ratio, large),
    };
  });
}

// Self-test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = [
    { fg: "#000000", bg: "#ffffff", expectMin: 20.5, expectMax: 21.5, label: "black on white" },
    { fg: "#ffffff", bg: "#ffffff", expectMin: 0.9, expectMax: 1.1, label: "white on white" },
    { fg: "#000000", bg: "#000000", expectMin: 0.9, expectMax: 1.1, label: "black on black" },
    { fg: "#777777", bg: "#ffffff", expectMin: 4.0, expectMax: 5.0, label: "gray on white (~AA)" },
  ];
  let fail = 0;
  for (const t of tests) {
    const r = contrastRatio(t.fg, t.bg);
    const ok = r >= t.expectMin && r <= t.expectMax;
    const status = ok ? "OK  " : "FAIL";
    console.log(`  ${status} ${t.label}: ratio=${r.toFixed(2)} (expected ${t.expectMin}-${t.expectMax})`);
    if (!ok) fail++;
  }
  // Knowme palette report
  console.log("\n  KnowMe dark palette spot check:");
  const knowmeReport = report([
    { fg: "#E5EEF8", bg: "#0B0F14", label: "ink on bg (dark)" },
    { fg: "#E04E28", bg: "#0B0F14", label: "ember on bg (dark)" },
    { fg: "#9BB0C8", bg: "#0B0F14", label: "muted on bg (dark)" },
  ]);
  for (const r of knowmeReport) {
    console.log(`    ${r.label}: ${r.ratio} (${r.level})`);
  }
  process.exit(fail);
}
