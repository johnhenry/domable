/**
 * dom-to-hyperscript.mjs -- new in this package: the missing dual of
 * `create-element.mjs`. `create-element.mjs` converts hyperscript calls
 * (`createElement(tag, props, ...children)`) INTO a DOM tree; nothing in
 * the original six modules converted a DOM tree back OUT into that same
 * call shape. Useful for devtools/codegen: "show me the `createElement()`
 * source that would rebuild this node."
 *
 * Two layers, matching this package's own compose-don't-reimplement
 * pattern (`text-to-react.mjs`/`react-to-text.mjs`):
 *   - `domToHyperscript(node)` -- DOM -> a plain `{tag, props, children}`
 *     DATA structure (props excludes `children`; `class` stays `class`,
 *     NOT translated to `className` -- this targets `create-element.mjs`'s
 *     own attribute convention, a deliberate difference from
 *     `dom-to-react.mjs`, which targets React's).
 *   - `hyperscriptToSource(hyperscriptNode, options)` -- that data
 *     structure -> literal, re-parseable JS source text, e.g.
 *     `createElement("div", {"id":"foo"}, createElement("span", {}, "hi"))`.
 *   - `domToSource(node, options)` -- the two composed; what most callers
 *     actually want.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

/**
 * @typedef {object} HyperscriptNode
 * @property {string|null} tag `null` for a fragment (no wrapping tag) --
 *   matches `create-element.mjs`'s own "omit the tag for a fragment" rule.
 * @property {object} props Attribute name/value pairs (always plain
 *   strings, since DOM attributes are always strings).
 * @property {Array<HyperscriptNode|string>} children
 */

/**
 * @param {Node} dom
 * @returns {HyperscriptNode|string}
 */
export default function domToHyperscript(dom) {
  if (dom.nodeType === TEXT_NODE) return dom.nodeValue;

  if (dom.nodeType === DOCUMENT_FRAGMENT_NODE) {
    return { tag: null, props: {}, children: [...dom.childNodes].map(domToHyperscript) };
  }

  if (dom.nodeType === ELEMENT_NODE) {
    const props = {};
    for (const attr of dom.attributes) props[attr.name] = attr.value;
    return {
      tag: dom.tagName.toLowerCase(),
      props,
      children: [...dom.childNodes].map(domToHyperscript),
    };
  }

  return { tag: null, props: {}, children: [] };
}

/**
 * @param {HyperscriptNode|string} node
 * @param {object} [options]
 * @param {string} [options.fn='createElement'] Identifier the emitted source calls.
 * @param {string} [options.indent] When set, pretty-prints with this indent unit; single-line otherwise.
 * @returns {string}
 */
export function hyperscriptToSource(node, options = {}) {
  const { fn = "createElement", indent } = options;
  return render(node, fn, indent, 0);
}

/**
 * @param {HyperscriptNode|string} node
 * @param {string} fn
 * @param {string|undefined} indent
 * @param {number} depth
 * @returns {string}
 */
function render(node, fn, indent, depth) {
  if (typeof node === "string") return JSON.stringify(node);

  const nl = indent ? "\n" + indent.repeat(depth + 1) : "";
  const closeNl = indent ? "\n" + indent.repeat(depth) : "";
  const sep = indent ? "," + nl : ", ";

  const args = [
    JSON.stringify(node.tag),
    JSON.stringify(node.props ?? {}),
    ...(node.children ?? []).map((child) => render(child, fn, indent, depth + 1)),
  ];

  if (!indent) return `${fn}(${args.join(", ")})`;
  return `${fn}(${nl}${args.join(sep)}${closeNl})`;
}

/**
 * `domToHyperscript` + `hyperscriptToSource` composed -- DOM straight to
 * re-parseable `createElement()` source text.
 *
 * @param {Node} dom
 * @param {object} [options] Same as `hyperscriptToSource`.
 * @returns {string}
 */
export function domToSource(dom, options) {
  return hyperscriptToSource(domToHyperscript(dom), options);
}
