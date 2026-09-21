#!/usr/bin/env node
//
// convert-htmx-react.mjs
//
// Deterministic HTMX/Alpine.js HTML → React TSX converter.
//
// Handles the mechanical 90%:
//   - HTML element tree → JSX
//   - class → className, for → htmlFor
//   - inline style="..." → style={{ ... }}
//   - Alpine `x-data="{ ... }"` → useState calls + a named hook `use<Feature>State`
//   - Alpine `@click="expr"`, `x-text="expr"`, `x-show="expr"` → JSX equivalents
//   - Self-closing tags closed properly
//
// Surfaces the ambiguous 10% to a sidecar:
//   - HTMX `hx-*` behaviors → recommendation + ask-LLM markdown
//   - Complex Alpine expressions
//
// Output:
//   <output>.tsx               — phase-2-ready TSX
//   <output>.ambiguous.md      — review-required regions (only if needed)
//
// Usage:
//   node scripts/convert-htmx-react.mjs --source X.html --feature-name foo --output Y.tsx

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, basename } from "node:path";
import { parseFragment } from "parse5";

// ---------- CLI ----------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const argv = parseArgs(process.argv);
for (const key of ["source", "feature-name", "output"]) {
  if (!argv[key]) {
    console.error(`missing required --${key}`);
    process.exit(2);
  }
}
const SOURCE = argv["source"];
const FEATURE = argv["feature-name"];
const OUTPUT = argv["output"];
const SIDECAR = argv["ambiguous-sidecar"] ?? `${OUTPUT}.ambiguous.md`;
const LLM_JUDGMENT = argv["llm-judgment"] === true || argv["llm-judgment"] === "true";

// ---------- Helpers ----------
function kebabToPascal(s) {
  return s
    .split(/[-_]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function kebabToCamel(s) {
  const parts = s.split(/[-_]+/);
  return parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

function escapeJsxText(s) {
  // Preserve whitespace but escape `{` and `}` so JSX doesn't try to parse expressions.
  return s.replace(/\{/g, "{'{'}").replace(/\}/g, "{'}'}");
}

function escapeAttrValue(v) {
  return v.replace(/"/g, '\\"');
}

function parseInlineStyle(styleStr) {
  // Returns { property: value } for camelCased CSS properties.
  const decls = {};
  for (const decl of styleStr.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    decls[camel] = val;
  }
  return decls;
}

function styleObjectToJsx(decls) {
  // { background: 'var(--color-bg)', color: '#fff' } → { background: "var(--color-bg)", color: "#fff" }
  const entries = Object.entries(decls).map(([k, v]) => {
    return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{{ ${entries.join(", ")} }}`;
}

// ---------- Walker state ----------
const ambiguousRegions = [];
const hookStates = []; // { name, init, raw }   from x-data
let needsUseState = false;
const usedImports = new Set();

// ---------- Walker ----------
function walk(node, depth = 0) {
  if (!node) return "";
  if (node.nodeName === "#text") {
    const t = node.value;
    if (!t.trim()) {
      return t; // preserve whitespace between elements
    }
    return escapeJsxText(t);
  }
  if (node.nodeName === "#comment") {
    return `{/*${node.data}*/}`;
  }
  if (node.nodeName === "#document-fragment") {
    return (node.childNodes || []).map((c) => walk(c, depth)).join("");
  }

  const tag = node.tagName;
  const attrs = node.attrs || [];

  // Pull off x-data first; it transforms the parent into a stateful component.
  const xData = attrs.find((a) => a.name === "x-data");
  if (xData) {
    parseXData(xData.value);
  }

  // Convert attrs.
  const jsxAttrs = [];
  for (const a of attrs) {
    const conv = convertAttr(a, depth);
    if (conv) jsxAttrs.push(conv);
  }

  const inner = (node.childNodes || []).map((c) => walk(c, depth + 1)).join("");
  const indent = "  ".repeat(depth + 1);
  const attrStr = jsxAttrs.length ? " " + jsxAttrs.join(" ") : "";

  // Self-closing if no children.
  if (!inner.trim() && !node.childNodes?.length) {
    return `<${tag}${attrStr} />`;
  }
  return `<${tag}${attrStr}>${inner}</${tag}>`;
}

function parseXData(value) {
  // value is a JS object literal: "{ count: 0, name: 'foo' }"
  // We do a *very* simple key:value parser. Anything complex → mark ambiguous.
  const m = value.match(/^\s*\{([^}]*)\}\s*$/);
  if (!m) {
    ambiguousRegions.push({
      kind: "x-data",
      raw: value,
      recommendation: "Complex Alpine x-data not auto-converted; manually lift to useState/useReducer.",
    });
    return;
  }
  const body = m[1].trim();
  if (!body) return; // empty object
  for (const part of splitTopLevelCommas(body)) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const init = part.slice(idx + 1).trim();
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      ambiguousRegions.push({
        kind: "x-data-key",
        raw: part,
        recommendation: "Non-identifier key in x-data — review manually.",
      });
      continue;
    }
    hookStates.push({ name: key, init, raw: part });
    needsUseState = true;
  }
}

function splitTopLevelCommas(s) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      if ("{[(".includes(ch)) depth++;
      if ("}])".includes(ch)) depth--;
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function convertAttr(attr, depth) {
  const { name, value } = attr;

  // x-data was already extracted; don't emit anything for it on the JSX element.
  if (name === "x-data") return null;

  // class → className
  if (name === "class") {
    return `className="${escapeAttrValue(value)}"`;
  }
  // for → htmlFor
  if (name === "for") {
    return `htmlFor="${escapeAttrValue(value)}"`;
  }
  // style → style={{ ... }}
  if (name === "style") {
    const decls = parseInlineStyle(value);
    return `style=${styleObjectToJsx(decls)}`;
  }
  // Alpine @click etc. → onClick={() => expr}
  if (name.startsWith("@")) {
    const evt = name.slice(1);
    const handlerName = "on" + evt.charAt(0).toUpperCase() + evt.slice(1);
    const handlerBody = transformAlpineExpr(value);
    return `${handlerName}={() => { ${handlerBody}; }}`;
  }
  // x-text → set as the JSX child via a marker we'll splice later. For simplicity,
  // we convert it to a {expr} child by emitting a special attribute we then
  // post-process. To keep the walker single-pass, we instead append a child node
  // synthetically here: we cannot, because we're returning an attribute. So we
  // take a shortcut: x-text becomes a comment + replace via post-processing.
  if (name === "x-text") {
    return `data-x-text-expr="${escapeAttrValue(transformAlpineExpr(value))}"`;
  }
  // x-show="expr" → no-op attr in this v1; document as ambiguous.
  if (name === "x-show") {
    ambiguousRegions.push({
      kind: "x-show",
      raw: `x-show="${value}"`,
      recommendation: `Wrap element in {${transformAlpineExpr(value)} && (...)} for conditional render.`,
    });
    return null;
  }
  // x-model="prop" → controlled input — also ambiguous; report.
  if (name === "x-model") {
    ambiguousRegions.push({
      kind: "x-model",
      raw: `x-model="${value}"`,
      recommendation: `Replace with value={${value}} onChange={(e) => set${value.charAt(0).toUpperCase() + value.slice(1)}(e.target.value)}.`,
    });
    return null;
  }
  // HTMX hx-* → ambiguous region, drop with marker comment.
  if (name.startsWith("hx-")) {
    ambiguousRegions.push({
      kind: "htmx",
      raw: `${name}="${value}"`,
      recommendation: `Replace HTMX call with useState + fetch in an onClick handler. See ambiguous sidecar.`,
    });
    return null;
  }
  // ARIA, data-*, role, id, src, href, alt, name, type, value, placeholder, etc. — pass through unchanged.
  if (/^(data-|aria-)/.test(name) || ["id", "src", "href", "alt", "name", "type", "placeholder", "title", "role", "rel", "target", "disabled", "checked", "readonly", "required"].includes(name)) {
    return value === "" ? name : `${name}="${escapeAttrValue(value)}"`;
  }
  // value → defaultValue for inputs (avoid controlled-input warnings)
  if (name === "value") {
    return `defaultValue="${escapeAttrValue(value)}"`;
  }

  // Unknown attribute — pass through as kebab attribute. React will warn.
  return `${name}="${escapeAttrValue(value)}"`;
}

function transformAlpineExpr(expr) {
  const trimmed = expr.trim();
  // count++  →  setCount((v) => v + 1)
  // count--  →  setCount((v) => v - 1)
  const incDec = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(\+\+|--)$/);
  if (incDec) {
    const name = incDec[1];
    const op = incDec[2] === "++" ? "+ 1" : "- 1";
    const setter = "set" + name.charAt(0).toUpperCase() + name.slice(1);
    return `${setter}((v) => v ${op})`;
  }
  // count = expr  →  setCount(expr)
  const assign = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+)$/);
  if (assign) {
    const name = assign[1];
    const setter = "set" + name.charAt(0).toUpperCase() + name.slice(1);
    return `${setter}(${assign[2]})`;
  }
  // Bare identifier (e.g., x-text="count")  →  pass through
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmed)) {
    return trimmed;
  }
  // Simple property access like `user.name` or `items[0]` — also passthrough.
  if (/^[a-zA-Z_$][a-zA-Z0-9_$.\[\]'"]*$/.test(trimmed) && !trimmed.includes(";")) {
    return trimmed;
  }
  // Fallback: leave verbatim and flag.
  ambiguousRegions.push({
    kind: "alpine-expr",
    raw: expr,
    recommendation: "Non-trivial Alpine expression; rewrite for React state semantics.",
  });
  return `/* TODO: convert: ${expr} */`;
}

// ---------- Post-process x-text markers ----------
function postProcessXText(jsx) {
  // <span data-x-text-expr="count" /> or <span data-x-text-expr="count">old</span>
  // → <span>{count}</span>
  return jsx
    .replace(
      /<(\w+)([^>]*?)\s+data-x-text-expr="([^"]+)"([^>]*?)\s*\/>/g,
      (_m, tag, before, expr, after) => `<${tag}${before}${after}>{${expr}}</${tag}>`,
    )
    .replace(
      /<(\w+)([^>]*?)\s+data-x-text-expr="([^"]+)"([^>]*?)>[^<]*<\/\1>/g,
      (_m, tag, before, expr, after) => `<${tag}${before}${after}>{${expr}}</${tag}>`,
    );
}

// ---------- Main ----------
const html = readFileSync(SOURCE, "utf8");
const fragment = parseFragment(html);
let jsxBody = walk(fragment).trim();
jsxBody = postProcessXText(jsxBody);

// Imports list is finalized AFTER the hook/store build because zustand+immer
// imports depend on the threshold decision (single-boolean stays useState).
// Initialize with a placeholder; replace below.
const imports = [];

// Build hook/store (if any)
// Threshold rule (state-architecture.md):
//   - Single boolean field → local useState hook (ephemeral component state)
//   - Multi-field OR any non-boolean → zustand+immer store + hook adapter
//
// Boolean detection: init value is exactly `true`, `false`, or omitted (which
// defaults to false). Numeric 0/1 are NOT treated as booleans — counts and
// flags-as-numbers belong in a store per the threshold rule.
function isBooleanInit(init) {
  const t = (init ?? "").trim();
  return t === "true" || t === "false" || t === "";
}
const isSingleBoolean =
  hookStates.length === 1 && isBooleanInit(hookStates[0].init);

let hookExport = "";
let hookConsume = "";
let hookImport = "";
let usesZustand = false;

if (hookStates.length > 0) {
  const pascalFeature = kebabToPascal(FEATURE);
  const hookName = `use${pascalFeature}State`;

  if (isSingleBoolean) {
    // Local useState path
    const s = hookStates[0];
    const setter = "set" + s.name.charAt(0).toUpperCase() + s.name.slice(1);
    hookExport = `\nexport function ${hookName}() {\n  const [${s.name}, ${setter}] = useState(${s.init || "false"});\n  return { ${s.name}, ${setter} };\n}\n`;
    hookConsume = `  const { ${s.name}, ${setter} } = ${hookName}();\n`;
  } else {
    // zustand + immer store + hook adapter path
    usesZustand = true;
    const storeName = `use${pascalFeature}Store`;

    const stateFields = hookStates
      .map((s) => `  ${s.name}: ${inferTypeFromInit(s.init)};`)
      .join("\n");
    const actionFields = hookStates
      .map((s) => `  set${s.name.charAt(0).toUpperCase() + s.name.slice(1)}: (v: ${inferTypeFromInit(s.init)}) => void;`)
      .join("\n");

    const initialBody = hookStates
      .map((s) => `    ${s.name}: ${s.init || "null"},`)
      .join("\n");
    const actionBody = hookStates
      .map((s) => {
        const setter = "set" + s.name.charAt(0).toUpperCase() + s.name.slice(1);
        return `    ${setter}: (v) => set((st) => { st.${s.name} = v; }),`;
      })
      .join("\n");

    hookExport = `
export const ${storeName} = create<{
${stateFields}
${actionFields}
}>()(
  immer((set) => ({
${initialBody}
${actionBody}
  })),
);

export function ${hookName}() {
${hookStates.map((s) => `  const ${s.name} = ${storeName}((st) => st.${s.name});`).join("\n")}
${hookStates.map((s) => `  const set${s.name.charAt(0).toUpperCase() + s.name.slice(1)} = ${storeName}((st) => st.set${s.name.charAt(0).toUpperCase() + s.name.slice(1)});`).join("\n")}
  return { ${hookStates.flatMap((s) => [s.name, `set${s.name.charAt(0).toUpperCase() + s.name.slice(1)}`]).join(", ")} };
}
`;
    const destructure = "{ " + hookStates.flatMap((s) => [s.name, `set${s.name.charAt(0).toUpperCase() + s.name.slice(1)}`]).join(", ") + " }";
    hookConsume = `  const ${destructure} = ${hookName}();\n`;
  }
}

function inferTypeFromInit(init) {
  const t = (init ?? "").trim();
  if (t === "true" || t === "false") return "boolean";
  if (/^-?\d+(\.\d+)?$/.test(t)) return "number";
  if (t.startsWith('"') || t.startsWith("'")) return "string";
  if (t.startsWith("[")) return "unknown[]";
  if (t.startsWith("{")) return "Record<string, unknown>";
  return "unknown";
}

// Now finalize the imports list based on what the hook/store build decided.
{
  const reactImport = needsUseState && !usesZustand
    ? `import React, { useState } from "react";`
    : `import React from "react";`;
  imports.push(reactImport);
  if (usesZustand) {
    imports.push(`import { create } from "zustand";`);
    imports.push(`import { immer } from "zustand/middleware/immer";`);
  }
  for (const imp of usedImports) imports.push(imp);
}

// Build component
const componentName = kebabToPascal(FEATURE);
const componentBody = `${hookConsume}  return (\n    ${jsxBody.split("\n").join("\n    ")}\n  );`;
const component = `\nexport default function ${componentName}() {\n${componentBody}\n}\n`;

// Build hook-from-self-import only if hookStates exist AND we want the
// component to call the hook by name (it's defined in the same file so no
// import needed). We've already emitted the hook above; the component just
// references it.

const output = imports.join("\n") + "\n" + hookExport + component;
writeFileSync(OUTPUT, output);
console.log(`Wrote ${OUTPUT} (${output.length} bytes)`);

// Write ambiguous sidecar if needed
if (ambiguousRegions.length > 0) {
  const lines = [
    `# Ambiguous regions in ${basename(SOURCE)}`,
    "",
    `Source: ${SOURCE}`,
    `Output: ${OUTPUT}`,
    `Feature: ${FEATURE}`,
    "",
    `${ambiguousRegions.length} region(s) require LLM judgment.`,
    "",
    "---",
    "",
  ];
  // Optional LLM judgment: call the routed endpoint to propose a JSX
  // translation for each ambiguous region. Gated by --llm-judgment; default off.
  let llmSuggestions = new Array(ambiguousRegions.length).fill(null);
  if (LLM_JUDGMENT) {
    try {
      const { chat, HostHarnessRoutingError } = await import("./lib/openai-client.mjs");
      console.log(`Requesting LLM judgment for ${ambiguousRegions.length} region(s)…`);
      for (let i = 0; i < ambiguousRegions.length; i++) {
        const r = ambiguousRegions[i];
        const prompt = `You are converting HTMX/Alpine HTML to React TSX. The deterministic ` +
          `transform left this region for human review. Propose a single React TSX ` +
          `equivalent. Be concise; one fenced code block.\n\n` +
          `Region kind: ${r.kind}\n\nSource:\n\`\`\`\n${r.raw}\n\`\`\`\n\n` +
          `Deterministic recommendation: ${r.recommendation}\n\nYour TSX:`;
        try {
          const suggestion = await chat(
            "refiner-iterate",
            [{ role: "user", content: prompt }],
            { artifactName: FEATURE, maxTokens: 300, temperature: 0.2 },
          );
          llmSuggestions[i] = suggestion.trim();
        } catch (err) {
          if (err instanceof HostHarnessRoutingError) {
            llmSuggestions[i] = `_LLM judgment unavailable: ${err.reason}_`;
          } else {
            llmSuggestions[i] = `_LLM error: ${err.message}_`;
          }
        }
      }
    } catch (err) {
      console.warn(`Could not load openai-client.mjs: ${err.message}; continuing without LLM judgment`);
    }
  }

  for (let i = 0; i < ambiguousRegions.length; i++) {
    const r = ambiguousRegions[i];
    lines.push(`## Region ${i + 1} — ${r.kind}`);
    lines.push("");
    lines.push("**Source:**");
    lines.push("```");
    lines.push(r.raw);
    lines.push("```");
    lines.push("");
    lines.push("**Recommendation:**");
    lines.push("");
    lines.push(r.recommendation);
    lines.push("");
    if (llmSuggestions[i]) {
      lines.push("**LLM suggestion:**");
      lines.push("");
      lines.push(llmSuggestions[i]);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }
  writeFileSync(SIDECAR, lines.join("\n"));
  console.log(`Wrote ${SIDECAR} (${ambiguousRegions.length} region(s) flagged${LLM_JUDGMENT ? ", with LLM suggestions" : ""})`);
} else {
  console.log("No ambiguous regions; no sidecar emitted.");
}

console.log(`Hooks lifted: ${hookStates.length}`);
console.log(`Ambiguous regions: ${ambiguousRegions.length}`);
