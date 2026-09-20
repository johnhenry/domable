/**
 * dom-to-text.mjs -- serialize real DOM nodes back into an HTML string.
 *
 * Ported from the standalone `DOM-nodes-to-text` module, which joined each
 * argument's `.outerHTML`. That approach can't round-trip anything built by
 * `simple-element.mjs`'s `shadowOpen`/`shadowClosed`: `.outerHTML` never
 * descends into shadow trees, so a shadow-DOM custom element serialized that
 * way silently loses its entire contents. This version writes its own
 * serializer instead, walking `element.shadowRoot` and emitting Declarative
 * Shadow DOM syntax (`<template shadowrootmode="...">...</template>`, the
 * real, standardized way to represent a shadow tree as static HTML) so the
 * Text <-> DOM <-> Custom-Element story in this package actually round-trips.
 *
 * Uses the native `Element#getHTML({serializableShadowRoots})` (newer
 * browsers) when available, since that's the platform's own, more complete
 * implementation of the same idea; falls back to the manual walker below
 * everywhere else (Node, older browsers, jsdom).
 *
 * KNOWN LIMITATION, not a bug: a `mode: 'closed'` shadow root is invisible
 * to `element.shadowRoot` by design (the whole point of "closed" is that
 * nothing outside the element that created it can read the reference back)
 * -- there is no way for ANY serializer, native or not, to recover closed
 * shadow content it wasn't handed directly. `domToText(closedElement)`
 * therefore renders the host element with no shadow content, which is
 * correct, expected behavior, not a gap to fix.
 */

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Elements whose text content is never HTML-escaped when serialized (matches the HTML spec's "raw text element" category). */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_FRAGMENT_NODE = 11;

/** @param {string} str @returns {string} */
function escapeText(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** @param {string} str @returns {string} */
function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** @param {Element} el @returns {string} */
function serializeAttrs(el) {
  let out = "";
  for (const attr of el.attributes) {
    out += ` ${attr.name}="${escapeAttr(attr.value)}"`;
  }
  return out;
}

/** @param {Element} el @returns {string} */
function serializeElement(el) {
  if (typeof el.getHTML === "function") return serializeWithNativeGetHTML(el);
  return serializeManually(el);
}

/** @param {Element} el @returns {string} */
function serializeWithNativeGetHTML(el) {
  // getHTML() (when present) serializes an element's *contents*, not the
  // element's own opening/closing tag -- mirror that by wrapping it in the
  // tag ourselves, matching outerHTML's contract (the whole element, not
  // just its children).
  const tag = el.tagName.toLowerCase();
  const attrs = serializeAttrs(el);
  if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${el.getHTML({ serializableShadowRoots: true })}</${tag}>`;
}

/** @param {Element} el @returns {string} */
function serializeManually(el) {
  const tag = el.tagName.toLowerCase();
  const attrs = serializeAttrs(el);
  if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs}>`;

  let inner = "";
  if (el.shadowRoot) {
    inner += `<template shadowrootmode="${el.shadowRoot.mode}">${serializeChildren(el.shadowRoot)}</template>`;
  }
  inner += RAW_TEXT_ELEMENTS.has(tag) ? el.textContent : serializeChildren(el);
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

/** @param {Node} parent @returns {string} */
function serializeChildren(parent) {
  let out = "";
  for (const child of parent.childNodes) out += serializeNode(child);
  return out;
}

/** @param {Node} node @returns {string} */
function serializeNode(node) {
  switch (node.nodeType) {
    case ELEMENT_NODE:
      return serializeElement(node);
    case TEXT_NODE:
      return escapeText(node.nodeValue);
    case COMMENT_NODE:
      return `<!--${node.nodeValue}-->`;
    case DOCUMENT_FRAGMENT_NODE:
      return serializeChildren(node);
    default:
      return "";
  }
}

/**
 * @param {...Node} nodes
 * @returns {string}
 */
export default function domToText(...nodes) {
  return nodes.map(serializeNode).join("\n");
}
