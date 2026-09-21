#!/usr/bin/env node
// svg-validate.mjs
//
// Strict SVG validation for LLM-generated SVG content.
//
// Exports:
//   isValidSvg(text) → { valid: bool, reasons: string[] }
//
// Validation checks (any failure → invalid):
//   1. Contains an opening <svg ... > tag near the start
//   2. Contains a closing </svg> tag
//   3. No <script> tags anywhere
//   4. No event handler attributes (on*= patterns: onclick, onload, onerror, onmouseover, etc.)
//   5. No `javascript:` URLs in href / xlink:href / src
//   6. Parses via parse5 without errors (uses parse5 as a forgiving HTML/XML parser; SVG is a subset)
//
// Rejects:
//   - LLM outputs that wrap SVG in markdown code fences (caller should strip first)
//   - SVG with embedded JS via <script>
//   - SVG with inline event handlers (XSS vector)
//   - SVG with javascript: URLs (XSS vector)
//   - Truncated / malformed SVG that parse5 can't parse

import { parseFragment } from "parse5";

export function isValidSvg(text) {
  const reasons = [];
  if (!text || typeof text !== "string") {
    return { valid: false, reasons: ["empty_or_not_string"] };
  }
  const trimmed = text.trim();

  // 1. Open + close tags
  if (!/<svg[\s>]/i.test(trimmed)) {
    reasons.push("missing_svg_open_tag");
  }
  if (!/<\/svg\s*>/i.test(trimmed)) {
    reasons.push("missing_svg_close_tag");
  }

  // 2. No script tags
  if (/<script[\s>]/i.test(trimmed)) {
    reasons.push("contains_script_tag");
  }

  // 3. No event handlers — match on-prefixed attributes with `=`
  // Examples: onclick="..." onload='...' onmouseover=...
  if (/\bon[a-z]+\s*=\s*['"]?/i.test(trimmed)) {
    reasons.push("contains_event_handler_attribute");
  }

  // 4. No javascript: URLs
  if (/(href|xlink:href|src)\s*=\s*['"]?\s*javascript:/i.test(trimmed)) {
    reasons.push("contains_javascript_url");
  }

  // 5. Parse via parse5 (forgiving but flags structural disasters)
  try {
    const fragment = parseFragment(trimmed);
    if (!fragment || !Array.isArray(fragment.childNodes) || fragment.childNodes.length === 0) {
      reasons.push("parse5_produced_no_nodes");
    }
    // Walk for any element named "script" (parse5 lowercases element names)
    const hasScript = walkForScript(fragment);
    if (hasScript && !reasons.includes("contains_script_tag")) {
      reasons.push("parse5_found_script_element");
    }
  } catch (e) {
    reasons.push(`parse5_threw:${e.message?.slice(0, 60) ?? "unknown"}`);
  }

  return { valid: reasons.length === 0, reasons };
}

function walkForScript(node) {
  if (!node) return false;
  if (node.nodeName === "script") return true;
  if (node.childNodes) {
    for (const child of node.childNodes) {
      if (walkForScript(child)) return true;
    }
  }
  return false;
}

// --- Self-test ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = [
    {
      label: "valid minimal SVG",
      input: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="red"/></svg>',
      expect: true,
    },
    {
      label: "valid with text element",
      input: '<svg viewBox="0 0 100 100"><text x="50" y="50" text-anchor="middle">A</text></svg>',
      expect: true,
    },
    {
      label: "rejects <script>",
      input: '<svg viewBox="0 0 100 100"><script>alert(1)</script></svg>',
      expect: false,
    },
    {
      label: "rejects onclick",
      input: '<svg viewBox="0 0 100 100"><rect onclick="alert(1)" width="100" height="100"/></svg>',
      expect: false,
    },
    {
      label: "rejects javascript: URL",
      input: '<svg viewBox="0 0 100 100"><a href="javascript:alert(1)"><rect width="100" height="100"/></a></svg>',
      expect: false,
    },
    {
      label: "rejects truncated SVG",
      input: '<svg viewBox="0 0 100 100"><rect width="100"',
      expect: false,
    },
    {
      label: "rejects empty input",
      input: "",
      expect: false,
    },
    {
      label: "rejects non-SVG HTML",
      input: '<div>hello</div>',
      expect: false,
    },
  ];
  let fail = 0;
  for (const t of tests) {
    const r = isValidSvg(t.input);
    const ok = r.valid === t.expect;
    const status = ok ? "OK  " : "FAIL";
    console.log(`  ${status} ${t.label.padEnd(38)} valid=${r.valid} reasons=[${r.reasons.join(",")}]`);
    if (!ok) fail++;
  }
  process.exit(fail);
}
