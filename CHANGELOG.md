# Changelog

## 0.0.0 -- initial release

Consolidates six previously-standalone modules from `johnhenry/lib`
(`text-to-DOM-nodes`, `DOM-nodes-to-text`, `create-element`,
`simple-element`, `react-to-dom`, `dom-to-React`) into one real npm package.
See README.md for the full design writeup (the Text/DOM/React conversion
matrix, and the complete list of real bugs found and fixed while merging --
not a line-for-line port).

**Added, ported from the original six** (see each module's own doc comment
for what changed versus the original, if anything):

- `textToDom` (from `text-to-DOM-nodes`) -- now returns a `DocumentFragment`
  instead of a raw `NodeList`, and parses via an `HTMLTemplateElement`
  instead of `DOMParser` (fixes a real bug: `<style>`/`<script>`/etc. were
  silently dropped, since the HTML spec routes them to a parsed document's
  `<head>` even when parsed in a body context).
- `domToText` (from `DOM-nodes-to-text`) -- new hand-written serializer,
  shadow-DOM aware (Declarative Shadow DOM syntax), where the original's
  plain `.outerHTML` join could not see into shadow trees at all.
- `domToReact` (from `dom-to-React`) -- fixed a `ReferenceError` on
  `DocumentFragment` input (used-before-declared `children`) and a broken
  attribute reader (`Object.entries()` on a `NamedNodeMap` never actually
  produced attribute pairs).
- `reactToDom` (from `react-to-dom`) -- fixed a `ReferenceError` on every
  non-fragment call (referenced an undefined `react` variable) and a crash
  on a single, non-array Fragment child.
- `createElement`/`createElementNS`/`createSVGElement`/`_`/`fromString`
  (from `create-element`) -- consolidated into one file; fixed a real edge
  case (`createElement(oneNode)` gaining a bogus second child).
- `html`/`svg` tag shorthands (from `create-element`'s generated
  `tags/html.mjs`/`tags/svg.mjs`) -- moved to their own subpaths
  (`@johnhenry/domable/html`, `@johnhenry/domable/svg`) rather than the main
  barrel, since both tag sets define overlapping names.
- `shadowOpen`/`shadowClosed`/`register`/`constructSuperclass` (from
  `simple-element`) -- fixed a real, previously-latent bug in the
  `useShadow: false` path (see `light`, below) and now accept a `Node`
  directly, not just an HTML string.

**New in this package** (no equivalent in the original six):

- `textToReact`/`reactToText` -- the two composed corners of the Text/DOM/
  React conversion triangle that no single original module covered.
- `light` (`simple-element`) -- the no-shadow preset the underlying factory
  already supported internally but never exposed; completes the
  open/closed/none set alongside `shadowOpen`/`shadowClosed`. Exposing and
  testing this path surfaced the fix described above: light-DOM children
  are now appended in `connectedCallback()`, not the constructor (the
  Custom Elements spec forbids the latter; real browsers enforce it, not
  just jsdom).
- `domToHyperscript`/`hyperscriptToSource`/`domToSource`
  (`dom-to-hyperscript`) -- the missing dual of `createElement()`: DOM back
  out to a reconstructable `{tag, props, children}` data structure, and
  literal, re-parseable `createElement(...)` source text.
