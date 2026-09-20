/**
 * create-element.mjs -- a `document.createElement`-alike that builds an
 * element with attributes and children in one call: `createElement(tag,
 * props, ...children)`, similar in spirit to React's JSX-less
 * `React.createElement` (https://reactjs.org/docs/react-without-jsx.html).
 *
 * Ported from the standalone `create-element` module (`createElementNS.mjs`
 * + `index.mjs` + `createSVGElement.mjs`), consolidated into one file now
 * that it lives alongside the rest of this package -- no behavior change
 * from the original beyond that consolidation.
 *
 * - The `tag` argument is optional: omitting it returns a `DocumentFragment`
 *   instead of an element (see the `_` export below for the common case of
 *   wanting only a fragment of children with no attributes).
 * - The `props` argument is optional, and may instead be a child (a string
 *   or a `Node`) passed directly as the second argument.
 * - `props.class` may be a string (set as-is) or an array of strings (added
 *   individually via `classList.add()`).
 * - `props.children`, if present, is prepended to any positional children
 *   arguments -- provided for JSX-transform compatibility, where a JSX
 *   factory's children often arrive this way.
 * - String children become text nodes; anything else is appended as-is.
 */

/**
 * @param {string|null} [namespace] `null` for `document.createElement`,
 *   or an XML namespace URI for `document.createElementNS` (see
 *   `createSVGElement` below for the one namespace this package ships).
 * @returns {(tag?: string|Node, props?: object|string|Node, ...children: Array<string|Node>) => Element|DocumentFragment}
 */
export function createElementNS(namespace = null) {
  return (tag = "", props = {}, ...children) => {
    if (props === null) props = {};
    if (tag instanceof Node) {
      // `props` may genuinely be a second child (a string or Node passed
      // positionally where an attributes object would normally go, e.g.
      // createElement(nodeA, nodeB, nodeC)) -- but it may also just be the
      // *default* `{}` from the `props = {}` parameter default, when the
      // caller passed a single bare Node and nothing else. A bare `{}` is
      // never a valid child either way (fragments have no attributes to
      // apply it to), so it's only re-included when it's actually
      // child-shaped -- otherwise a single-Node call like
      // createElement(someNode) would silently gain a second, bogus child.
      const secondChild = typeof props === "string" || props instanceof Node ? [props] : [];
      children = [tag, ...secondChild, ...children];
      props = {};
      tag = "";
    } else if (typeof props === "string" || props instanceof Node) {
      children.unshift(props);
      props = {};
    }

    const element = tag
      ? namespace === null
        ? globalThis.document.createElement(tag)
        : globalThis.document.createElementNS(namespace, tag)
      : new globalThis.DocumentFragment();

    for (const [key, value] of Object.entries(props)) {
      if (key === "children") {
        children = Array.isArray(value) ? [...value, ...children] : [value, ...children];
        continue;
      }
      if (key === "class" && Array.isArray(value)) {
        element.classList.add(...value);
        continue;
      }
      element.setAttribute(key, value);
    }

    for (const child of children) {
      element.append(typeof child === "string" ? globalThis.document.createTextNode(child) : child);
    }

    return element;
  };
}

/** The default namespace-less factory -- `document.createElement`-shaped. */
const createElement = createElementNS(null);

/** SVG namespace factory -- `createElement`-shaped, but for `document.createElementNS(SVG_NAMESPACE, ...)`. */
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const createSVGElement = createElementNS(SVG_NAMESPACE);

/** Shorthand for building a bare `DocumentFragment` of children -- `createElement()` with no tag, spelled without the empty first argument. */
export const _ = (...children) => createElement(...children);

/** Re-exported for convenience -- the same `textToDom` this module itself uses nowhere directly, but that pairs naturally with hand-built elements (e.g. `createElement("div", {}, ...textToDom(str).childNodes)`). */
export { default as fromString } from "./text-to-dom.mjs";

export default createElement;
