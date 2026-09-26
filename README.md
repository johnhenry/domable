# @johnhenry/domable

[![npm version](https://img.shields.io/npm/v/%40johnhenry%2Fdomable.svg)](https://www.npmjs.com/package/@johnhenry/domable)
[![CI](https://github.com/johnhenry/domable/actions/workflows/ci.yml/badge.svg)](https://github.com/johnhenry/domable/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40johnhenry%2Fdomable.svg)](LICENSE)

Full documentation: [opensource.johnhenry.me/domable](https://opensource.johnhenry.me/domable/)

Convert between HTML text, real DOM nodes, and React-element-shaped objects.
Build DOM directly with a `createElement()`-style hyperscript API. Turn HTML
strings (or DOM nodes) into Custom Element classes.

**Provenance**: this package consolidates six previously-standalone modules
from [`johnhenry/lib`](https://github.com/johnhenry/lib) --
`text-to-DOM-nodes`, `DOM-nodes-to-text`, `create-element`, `simple-element`,
`react-to-dom`, and `dom-to-React` -- which already depended on each other via
relative sibling imports. Merging them into one real package removes that
cross-repo reach, and made it possible to notice (and fix) several real bugs
that had gone undetected because the six were never tested together. See
"Bugs found while merging" below for the full list -- this is not a
line-for-line port; several modules changed shape to fix a real defect or
close a real gap.

No runtime dependencies. Every module is written against standard browser
globals (`document`, `DOMParser`, `Node`, `customElements`, ...) and runs
unmodified in a browser; tests run under Node against a real DOM
implementation ([jsdom](https://github.com/jsdom/jsdom), not a mock).

## Contents

- [Install](#install)
- [The conversion matrix](#the-conversion-matrix)
- [`createElement` -- a hyperscript DOM builder](#createelement----a-hyperscript-dom-builder)
- [`domToText` -- serializing DOM back to HTML, including shadow DOM](#domtotext----serializing-dom-back-to-html-including-shadow-dom)
- [`simple-element` -- HTML text (or a `Node`) to a Custom Element class](#simple-element----html-text-or-a-node-to-a-custom-element-class)
- [`dom-to-hyperscript` -- DOM to reconstructable source (new in this package)](#dom-to-hyperscript----dom-to-reconstructable-source-new-in-this-package)
- [Bugs found while merging](#bugs-found-while-merging)
- [Honest limitations](#honest-limitations)
- [License](#license)

## Install

```
npm install @johnhenry/domable
```

Ships hand-written TypeScript declarations (`.d.mts`) for every module, wired
into `package.json`'s `exports` map (a `"types"` condition on every subpath,
not just the root) -- no `@types/` package needed.

## The conversion matrix

Three representations -- **Text** (an HTML string), **DOM** (a real `Node`),
and **React** (a plain object shaped like `React.createElement()`'s own
output) -- and a function for every arrow between them:

```
            -> Text        -> DOM              -> React
Text        (itself)       textToDom            textToReact
DOM         domToText      (itself)              domToReact
React       reactToText    reactToDom            (itself)
```

`textToReact`/`reactToText` are thin compositions of the other four, not
reimplementations -- they stay correct automatically if the underlying
conversions change.

```javascript
import { textToDom, domToText, domToReact, reactToDom, textToReact, reactToText } from "@johnhenry/domable";

const frag = textToDom("<div>hi</div>");           // -> DocumentFragment
domToText(frag.firstChild);                          // -> '<div>hi</div>'

const react = domToReact(frag.firstChild);            // -> {$$typeof, type: "div", props: {children: ["hi"]}, ...}
reactToDom(react).outerHTML;                            // -> '<div>hi</div>'

textToReact("<div>hi</div>");                             // -> same shape as `react` above
reactToText(react);                                         // -> '<div>hi</div>'
```

React itself is never imported or required -- these produce/consume plain
objects matching the real shape `React.createElement()` returns
(`$$typeof: Symbol.for("react.element")`, etc.), so the result is usable
anywhere a real React element is (passed to `ReactDOM.render()`, diffed by
React itself, ...) without this package depending on React.

## `createElement` -- a hyperscript DOM builder

`document.createElement`-alike that sets attributes and appends children in
one call, similar to React's
[JSX-less `React.createElement`](https://reactjs.org/docs/react-without-jsx.html):

```javascript
import createElement, { _ } from "@johnhenry/domable/create-element";

const list = createElement("ul", { id: "foo" },
  createElement("li", {}, "bar"),
  document.createElement("li"),
);
list.outerHTML;
// <ul id="foo"><li>bar</li><li></li></ul>
```

- **`tag` is optional.** Omit it (or pass a `Node`/string as the first
  argument instead) and you get a `DocumentFragment` of children back, with
  no wrapping element. `_` is shorthand for exactly that: `_(...)` ==
  `createElement(...)`.
- **`props` is optional.** A `Node` or string passed as the second argument
  is treated as the first child instead.
- **`props.class`** may be a string (set as-is) or an array of strings
  (added individually via `classList.add()`).
- **`props.children`**, if present, is prepended to any positional children
  -- for compatibility with JSX transforms that pass children this way.
- String children become text nodes; `Node` children are appended as-is.

### SVG and MathML

```javascript
import { createSVGElement, SVG_NAMESPACE, createMathMLElement, MATHML_NAMESPACE } from "@johnhenry/domable/create-element";
createSVGElement("circle", { r: "5" }).namespaceURI === SVG_NAMESPACE; // true
createMathMLElement("mrow").namespaceURI === MATHML_NAMESPACE; // true
```

`reactToDom` (below) is namespace-aware too: a React-element-shaped `<svg>`
or `<math>` node, and everything nested inside it, is built in the correct
namespace automatically -- you don't need `createSVGElement`/
`createMathMLElement` yourself unless you're building elements directly.

### Per-tag shorthands

Every HTML and SVG element has a shorthand function equivalent to
`createElement("tagname", ...)` / `createSVGElement("tagname", ...)`. Kept on
**separate subpaths**, not the main barrel -- both tag sets independently
define common names (`a`, `audio`, `canvas`, `script`, `style`, `svg`,
`title`, `video`, ...), so flattening them into one namespace would silently
collide:

```javascript
import { html, head, title, body, div, ul, li } from "@johnhenry/domable/html";
import { circle, path } from "@johnhenry/domable/svg";

html({ lang: "en" }, head({}, title({}, "Hello")), body({}, ul({}, li({}, "item"))));
```

`var` and `switch` are exported uppercased (`Var`, `Switch`) since both are
reserved words; hyphenated SVG tag names (`color-profile`, `font-face`, ...)
are exported with underscores in place of hyphens (`color_profile`,
`font_face`).

## `domToText` -- serializing DOM back to HTML, including shadow DOM

```javascript
import domToText from "@johnhenry/domable/dom-to-text";
domToText(document.querySelector("#list"));
```

Writes its own serializer rather than just joining `.outerHTML` strings,
specifically so it can round-trip what `simple-element` (below) builds:
`.outerHTML` never descends into shadow trees, so a shadow-DOM custom element
serialized that way would silently lose its entire contents.
`domToText`/`domToSource` (see `dom-to-hyperscript`, below) walk
`element.shadowRoot` and emit
[Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
syntax (`<template shadowrootmode="open">...</template>`) instead. Uses the
native `Element#getHTML({serializableShadowRoots})` where available (newer
browsers), falling back to a manual walker everywhere else. `open` shadow
roots built by `simple-element` (below) are attached with
`serializable: true` specifically so that native path includes them, rather
than silently omitting their contents (`serializable` is a separate,
`attachShadow()`-time flag independent of `mode` -- it, not `mode`, is what
`getHTML()`'s `serializableShadowRoots` option actually checks).

**Known limitation, not a bug**: a `mode: 'closed'` shadow root is invisible
to `element.shadowRoot` by design -- there is no way for *any* serializer,
native or not, to recover closed shadow content it was never handed. A
closed custom element serializes as just its host tag, with no shadow
content -- correct, expected behavior.

## `simple-element` -- HTML text (or a `Node`) to a Custom Element class

```javascript
import { shadowOpen, shadowClosed, light, register } from "@johnhenry/domable/simple-element";

customElements.define("sample-element", shadowOpen`<div>I am HTML</div>`);
// or, as a regular function call:
customElements.define("sample-element", shadowOpen("<div>I am HTML</div>"));
// or, in one step:
register("sample-element", {})`<div>I am HTML</div>`;
```

- **`shadowOpen`** -- accessible shadow root (`element.shadowRoot` returns
  the real root).
- **`shadowClosed`** -- inaccessible shadow root (`element.shadowRoot`
  returns `null`).
- **`light`** -- no shadow root at all; children go straight into light DOM.
- **`register(tagname, options, ...rest)`** -- builds the class *and* calls
  `customElements.define()` in one step. `rest` is forwarded to `define()`
  after the class.
- **`constructSuperclass({HTML, shadowHTML, shadowMode, baseElement})`** --
  lower-level: independently control light-DOM and shadow-DOM content on the
  same element (e.g. a `<style>`-bearing shadow tree *and* light-DOM
  fallback content).

**New in this package: `Node` input.** All of the above now also accept a
real `Node`/`DocumentFragment` directly, not just an HTML string -- since
`create-element` already builds DOM trees directly, requiring a
serialize-then-reparse round trip through text just to turn one into a
Custom Element was a pointless step once the two lived in the same package.
Each instantiated element gets its own `.cloneNode(true)` of the input, so
one source `Node` can safely back any number of custom elements.

```javascript
import createElement from "@johnhenry/domable/create-element";
import { light } from "@johnhenry/domable/simple-element";

const built = createElement("div", { class: "card" }, "built with createElement, not a string");
customElements.define("built-element", light(built));
```

### Composing / slots / styling

Use `<slot>` to let other elements embed content, and a `<style>` tag
(scoped to the shadow root, so it only affects this element) to style it --
see `simple-element.test.mjs` for real, running examples of both, including
named slots and the `::part()` pseudo-element for styling parts of a shadow
tree from outside it.

## `dom-to-hyperscript` -- DOM to reconstructable source (new in this package)

`create-element` converts hyperscript calls *into* a DOM tree. Nothing in
the original six modules converted a DOM tree back *out* into that same call
shape -- useful for devtools/codegen ("show me the `createElement()` source
that would rebuild this node").

```javascript
import domToHyperscript, { hyperscriptToSource, domToSource } from "@johnhenry/domable/dom-to-hyperscript";

const el = createElement("div", { id: "foo" }, createElement("span", {}, "hi"));

domToHyperscript(el);
// { tag: "div", props: { id: "foo" }, children: [{ tag: "span", props: {}, children: ["hi"] }] }

domToSource(el);
// 'createElement("div", {"id":"foo"}, createElement("span", {}, "hi"))'

domToSource(el, { indent: "  " }); // pretty-printed, multi-line
domToSource(el, { fn: "h" });      // call a different identifier, e.g. for a different hyperscript lib
```

Note: `domToHyperscript`'s `props` keeps `class` as `class` (targets
`create-element`'s own attribute convention) -- unlike `domToReact`, which
translates it to `className` (targets React's convention). These are
deliberately different, matching what each conversion actually feeds into.

## Bugs found while merging

Testing these six modules together (most had no tests at all before) surfaced
real, previously-undetected bugs -- fixed here, not silently ported:

- **`react-to-dom`**: referenced a bare `react.type`/`react.props` that was
  never in scope (the function's own parameter was destructured directly) --
  every call to the non-fragment path threw a `ReferenceError`.
- **`react-to-dom`**: a Fragment's `props.children` was assumed to already be
  an array, but real React (and `domToReact`) can hand back a *single*,
  non-array child -- crashed on `.map()`.
- **`dom-to-React`**: a `DocumentFragment`'s children were pushed into a
  `children` array declared *after* that code ran -- guaranteed
  `ReferenceError` the moment a fragment was converted.
- **`dom-to-React`**: attributes were read via `Object.entries(dom.attributes)`
  -- `dom.attributes` is a `NamedNodeMap`, not a plain object, so this never
  actually produced `[name, value]` pairs; no attribute ever made it into
  `props`.
- **`text-to-DOM-nodes`**: parsed via `DOMParser(...).body.childNodes`.
  Per the HTML parsing spec, `<style>`/`<script>`/`<link>`/`<meta>`/`<title>`/
  `<base>` are parsed using "in head" rules *even inside a `<body>`
  context* -- they silently end up in the parsed document's `<head>` and
  never appear in `.body.childNodes`. `simple-element`'s own README used a
  `<style>`-in-`shadowOpen` example as its lead "Styling Elements" demo --
  meaning that exact documented pattern silently produced no styling at all,
  in every browser, the whole time. Fixed by parsing into an
  `HTMLTemplateElement`'s `.content` instead (the standard technique for
  parsing an HTML *fragment* without element-specific top-of-document
  reinterpretation) -- also simpler, since `.content` is already a real
  `DocumentFragment`.
- **`create-element`**: `createElement(oneNode)` (a single bare `Node`
  argument, nothing else) silently gained a second, bogus child from the
  `props = {}` default value being swept into the children array alongside
  the real one. Surfaced by `reactToDom`'s Fragment-with-one-child path.
- **`simple-element`**'s own (previously unexported, untested)
  `useShadow: false` branch appended light-DOM children directly inside the
  constructor -- which the Custom Elements spec forbids (only shadow-DOM
  content is allowed synchronously during construction; real browsers
  enforce this too). Fixed by deferring light-DOM content to
  `connectedCallback()` (guarded against duplicating on reconnect).

## Honest limitations

- **`reactToDom`'s SVG/MathML namespacing doesn't special-case
  `<foreignObject>`.** Once inside a `<svg>` (or `<math>`), every descendant
  is built in that namespace, matching normal HTML-parser behavior -- except
  the parser also switches BACK to the HTML namespace for ordinary elements
  nested inside `<foreignObject>` (the one sanctioned way to embed real HTML
  inside SVG), and `reactToDom` does not replicate that one exception. Build
  `<foreignObject>` content with `createElement`/the `html` tag shorthands
  directly (not through `reactToDom`) if you need this.
- **Closed shadow roots cannot be serialized.** A `mode: 'closed'` shadow
  root makes `element.shadowRoot` return `null` by design -- there is no
  API surface for `domToText`/`domToSource` (or any other serializer,
  native or not) to reach content it was never handed. A closed custom
  element serializes as just its host tag, with no shadow content. This is
  correct, expected behavior, not a bug to fix -- see
  [`domToText`](#domtotext----serializing-dom-back-to-html-including-shadow-dom)
  above.
- **Function-valued props don't become event listeners.**
  `createElement`/`reactToDom` set every non-special prop via
  `element.setAttribute(key, value)`, which coerces its argument to a
  string. A React-shaped `{ onClick: () => {...} }` prop -- exactly the
  kind of value `domToReact`'s own output can legitimately contain --
  becomes a literal `onclick="() => {...}"` attribute string on the
  resulting DOM node, not a real, callable event listener. Attach event
  listeners yourself with `addEventListener()` after building the element;
  this package has no JSX-style synthetic event system.

## License

MIT
