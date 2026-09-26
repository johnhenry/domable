# Changelog

## 0.0.1

Three real bugs reported after use in a real showcase project (ORRERY), all fixed with regression tests:

- **#2 -- `reactToDom` built `<svg>`/`<math>` (and their descendants) in the
  wrong namespace.** Every node was built via plain
  `document.createElement`, which is always the HTML namespace -- `<svg>`,
  `<circle>`, `<path>`, etc. built from a React-element-shaped object ended
  up with `namespaceURI` of `"http://www.w3.org/1999/xhtml"` instead of
  `"http://www.w3.org/2000/svg"`, and silently failed to render.
  `textToDom()` was unaffected (the browser's HTML parser namespaces
  `<svg>`/`<math>` correctly on its own); only the `reactToDom` path, which
  builds one element at a time with no parser to do that switching for it,
  had the bug. Fixed by threading the current namespace through
  `reactToDom`'s own recursion and switching it via `create-element.mjs`'s
  `createElementNS` (the same mechanism `createSVGElement` is built from)
  whenever a `svg`/`math` element is encountered; descendants inherit
  whichever namespace they were built under. Added `MATHML_NAMESPACE`/
  `createMathMLElement` to `create-element.mjs` (and the main barrel),
  alongside the existing `SVG_NAMESPACE`/`createSVGElement`.
- **#3 -- `domToText` could drop open shadow roots created by
  `simple-element` in Chrome.** `domToText` prefers the native
  `Element#getHTML({serializableShadowRoots: true})` where available;
  that option only includes a shadow root whose *own* `serializable` flag
  (a separate, `attachShadow()`-time flag, independent of `mode`) is
  `true`. `simple-element.mjs`'s `attachShadow()` call never set it, so an
  otherwise-accessible (`mode: 'open'`) shadow root's content was silently
  omitted from `domToText`'s output on browsers with `getHTML()`. Fixed at
  the source: `shadowOpen`/`constructSuperclass`'s `shadowHTML` now call
  `attachShadow({..., serializable: true})` for **open** shadow roots only
  -- deliberately **not** for `shadowClosed`, since `serializable` is
  independent of `mode`, and opting a *closed* root in would let
  `getHTML()` leak its content even though `element.shadowRoot` correctly
  still returns `null`, defeating the one guarantee `closed` mode provides
  (see `AGENTS.md`'s "closed shadow roots are genuinely unrecoverable").
  **Verification note**: this repo's test environment (jsdom) does not
  implement `Element#getHTML()` at all, so `domToText` always takes its
  manual-walker fallback path under test -- a path that reads
  `element.shadowRoot` directly and was never affected by this bug. The fix
  itself is verified with a targeted unit test (spying on
  `Element.prototype.attachShadow` to assert `serializable: true`/`false` is
  passed correctly); the native-`getHTML()` code path this actually fixes
  could not be exercised end-to-end in this environment.
- **#4 -- No TypeScript declarations shipped.** `@johnhenry/domable` had no
  `types` field, no `.d.ts`/`.d.mts` files, and `exports` listed only
  `.mjs` entries -- TypeScript consumers got `TS7016` on every import.
  Added a `.d.mts` file alongside every `src/` module (matching the real,
  verified export list of each -- not the surface a bug report guessed at),
  a `"types"` field at the package root, and a `"types"` condition on every
  entry in the `exports` map (not just `.`). Verified by installing this
  package into a scratch project via `file:` and type-checking a file that
  imports every export (root barrel and every subpath) under both
  `moduleResolution: "nodenext"` and `"bundler"` with `strict: true` --
  zero errors either way.

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
