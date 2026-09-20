/**
 * text-to-dom.mjs -- parse an HTML string into a real DOM tree.
 *
 * Ported from the standalone `text-to-DOM-nodes` module (originally
 * https://gomakethings.com/converting-a-string-into-markup-with-vanilla-js/),
 * which used `new DOMParser().parseFromString(str, "text/html").body
 * .childNodes`. That approach has a real, previously-undiscovered bug:
 * per the HTML parsing spec, "metadata content" elements (`<style>`,
 * `<script>`, `<link>`, `<meta>`, `<title>`, `<base>`) are parsed using
 * the "in head" insertion-mode rules EVEN WHEN they appear in a `<body>`
 * context -- they silently end up in the parsed document's `<head>`, not
 * its `<body>`, and so never appear in `.body.childNodes` at all. This
 * isn't a jsdom quirk; real browsers do the same thing (it's how the spec
 * is written). Concretely: `textToDom("<style>*{color:red}</style>")`
 * returned an EMPTY result with the original approach -- and since
 * `simple-element.mjs`'s whole "Styling Elements" story is `<style>` tags
 * inside `shadowOpen`/`shadowClosed` template strings, this silently broke
 * exactly the use case that module's own README used as its lead example.
 *
 * Fixed by parsing into an `HTMLTemplateElement`'s `.content` instead of
 * via `DOMParser`. A `<template>`'s content is parsed in "template
 * contents" mode, which treats `<style>`/`<script>`/etc. as ordinary flow
 * content (no head/body routing) -- the standard, well-known technique for
 * parsing an arbitrary HTML *fragment* string without the parser
 * reinterpreting elements that only have special meaning at the top level
 * of a full document. `.content` is already a real `DocumentFragment` by
 * spec, so this is also simpler than the original: no separate fragment
 * construction/copy step needed.
 */

/**
 * @param {string} str
 * @returns {DocumentFragment}
 */
export default function textToDom(str) {
  const template = globalThis.document.createElement("template");
  template.innerHTML = str;
  return template.content;
}
