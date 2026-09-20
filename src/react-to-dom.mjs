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
 * `className` -> `class` is the one deliberate naming translation, the
 * inverse of `dom-to-react.mjs`'s own `class` -> `className` -- together
 * the two form a real round-trip: `reactToDom(domToReact(node))` reproduces
 * `node`, and `domToReact(reactToDom(element))` reproduces `element`.
 */

import createElement, { _ as fragment } from "./create-element.mjs";

const REACT_FRAGMENT_SYMBOL = Symbol.for("react.fragment");

/** @param {*} children @returns {Array} Always an array, matching real React's flexible `props.children` shape (absent, a single child, or an array). */
function normalizeChildren(children) {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}

/**
 * @param {{$$typeof?: symbol, type?: *, props?: object}} reactElement
 * @returns {Node}
 */
export default function reactToDom(reactElement) {
  const { type = REACT_FRAGMENT_SYMBOL, props = {} } = reactElement || {};
  const children = normalizeChildren(props.children).map((child) =>
    typeof child === "string" ? child : reactToDom(child),
  );

  if (type === REACT_FRAGMENT_SYMBOL) return fragment(...children);

  const { className, children: _children, ...rest } = props;
  const attrs = className === undefined ? rest : { ...rest, class: className };
  return createElement(type, attrs, ...children);
}
