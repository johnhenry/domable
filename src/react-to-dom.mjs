/**
 * react-to-dom.mjs -- convert a React-element-shaped plain object (real
 * React elements, or anything else matching `{$$typeof, type, props}`, e.g.
 * `dom-to-react.mjs`'s own output) into a real DOM node.
 *
 * Ported from the standalone `react-to-dom` module, which had two real bugs
 * fixed here:
 *   1. Its body referenced a bare `react.type`/`react.props`, but the
 *      function's own parameter was destructured directly (`{ $$typeof,
 *      props }`) -- there was never a variable named `react` in scope, so
 *      every non-fragment call threw a `ReferenceError`.
 *   2. `props.children` was assumed to already be an array in the fragment
 *      branch, but not normalized the same way the (working) non-fragment
 *      branch normalized it -- a single-child fragment (`children` not
 *      wrapped in an array, which is exactly how real React represents a
 *      fragment with one child) would crash on `.map()`.
 *
 * A third bug, fixed here: every node was built via `document.createElement`
 * (plain, namespace-less), so `<svg>`/`<math>` and their descendants
 * (`<circle>`, `<path>`, `<mrow>`, ...) ended up in the HTML namespace
 * instead of the SVG/MathML namespace and silently failed to render
 * (`namespaceURI` was `"http://www.w3.org/1999/xhtml"` instead of the SVG/
 * MathML namespace URI). `textToDom()` gets correct namespacing for free
 * from the browser's HTML parser (which switches namespace on `<svg>`/
 * `<math>` itself) -- this only ever affected the `reactToDom` path, which
 * builds elements one at a time with no parser to do that switching for it.
 * Fixed by threading the current namespace through the recursion, using
 * `create-element.mjs`'s own `createElementNS` (the same mechanism
 * `createSVGElement` is built from, not a separate one) and switching it
 * whenever a `svg` or `math` element is encountered -- descendants inherit
 * whichever namespace they were built under, exactly like the HTML parser's
 * own "namespace, once entered, applies to descendants" behavior.
 *
 * `className` -> `class` is the one deliberate naming translation, the
 * inverse of `dom-to-react.mjs`'s own `class` -> `className` -- together
 * the two form a real round-trip: `reactToDom(domToReact(node))` reproduces
 * `node`, and `domToReact(reactToDom(element))` reproduces `element`.
 */

import {
  _ as fragment,
  createElementNS,
  SVG_NAMESPACE,
  MATHML_NAMESPACE,
} from "./create-element.mjs";

const REACT_FRAGMENT_SYMBOL = Symbol.for("react.fragment");

/** @param {*} children @returns {Array} Always an array, matching real React's flexible `props.children` shape (absent, a single child, or an array). */
function normalizeChildren(children) {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}

/**
 * @param {{$$typeof?: symbol, type?: *, props?: object}} reactElement
 * @param {string|null} [namespace] The namespace URI new elements are built
 *   under (`null` for the default HTML namespace) -- callers never need to
 *   pass this; it's threaded through the function's own recursion once a
 *   `svg`/`math` element switches it.
 * @returns {Node}
 */
export default function reactToDom(reactElement, namespace = null) {
  const { type = REACT_FRAGMENT_SYMBOL, props = {} } = reactElement || {};

  const childNamespace =
    type === "svg" ? SVG_NAMESPACE : type === "math" ? MATHML_NAMESPACE : namespace;

  const children = normalizeChildren(props.children).map((child) =>
    typeof child === "string" ? child : reactToDom(child, childNamespace),
  );

  if (type === REACT_FRAGMENT_SYMBOL) return fragment(...children);

  const { className, children: _children, ...rest } = props;
  const attrs = className === undefined ? rest : { ...rest, class: className };
  return createElementNS(childNamespace)(type, attrs, ...children);
}
