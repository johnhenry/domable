/**
 * _setup-dom.mjs -- installs a real jsdom window's globals (document,
 * DOMParser, Node, HTMLElement, DocumentFragment, customElements, etc.)
 * onto `globalThis` before any test file runs, so every `src/` module (all
 * written against real browser globals, since they also run unmodified in
 * an actual browser) works unchanged under `node --test`.
 *
 * jsdom, not a hand-rolled mock: it's a real, spec-driven DOM
 * implementation (Shadow DOM, Custom Elements, DOMParser included), the
 * same "real dependency, not a stand-in" standard the rest of this
 * package's tests hold to.
 *
 * Run: node --import ./test/_setup-dom.mjs --test test/*.test.mjs
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/",
});

const { window } = dom;

const KEYS = [
  "document",
  "DOMParser",
  "Node",
  "Element",
  "HTMLElement",
  "DocumentFragment",
  "Text",
  "Comment",
  "customElements",
  "Event",
  "CustomEvent",
];

for (const key of KEYS) {
  if (key in window) globalThis[key] = window[key];
}
