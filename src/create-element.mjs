/**
 * create-element.mjs -- a `document.createElement`-alike that builds an
 * element with attributes, properties, event listeners and children in one
 * call: `createElement(tag, props, ...children)`, similar in spirit to
 * React's JSX-less `React.createElement`
 * (https://reactjs.org/docs/react-without-jsx.html).
 *
 * Ported from the standalone `create-element` module (`createElementNS.mjs`
 * + `index.mjs` + `createSVGElement.mjs`), consolidated into one file now
 * that it lives alongside the rest of this package.
 *
 * - The `tag` argument is optional: omitting it returns a `DocumentFragment`
 *   instead of an element (see the `_` export below for the common case of
 *   wanting only a fragment of children with no attributes).
 * - The `props` argument is optional, and may instead be a child (anything
 *   child-shaped: a string, number, bigint, boolean, `Node`, or an
 *   array/iterable of children) passed directly as the second argument.
 * - `props` keys (issue #9):
 *     - `".name"` sets the DOM *property* `element.name` (never an
 *       attribute) -- `value`, `checked`, custom-element setters, ...
 *     - `"@type"` adds an event listener for `type`, verbatim (no case
 *       change): `fn`, an `EventListener` object, or `[listener, options]`.
 *       (A string value is still an attribute, e.g. for Alpine.js.)
 *     - `"onType"`/`"ontype"` with a FUNCTION value adds a listener for
 *       `type.toLowerCase()`; never written as an inline-handler attribute.
 *     - `class`: a string (as-is), an array of strings (falsy entries
 *       skipped), or a `{ name: boolean }` object.
 *     - `style`: a string (as-is) or an object of declarations (`--custom`
 *       and `kebab-case` keys via `style.setProperty`, `camelCase` keys via
 *       `style[key] =`).
 *     - `children`: prepended to any positional children (JSX-transform
 *       compatibility).
 *     - anything else is an attribute: `null`/`undefined`/`false` skip it,
 *       `true` sets it to `""` (boolean attributes) -- except `aria-*`/
 *       `data-*`, whose booleans are written as `"true"`/`"false"` since
 *       those are string-valued, not boolean, attributes.
 * - Children: `null`/`undefined`/`true`/`false` are skipped; arrays and
 *   other non-string iterables (`NodeList`, generators, ...) are flattened;
 *   strings, numbers and bigints become text nodes; `Node`s are appended
 *   as-is.
 * - Order of application: attributes (incl. `class`/`style`) and listeners,
 *   then children, then properties last -- so `{ ".value": "b" }` on a
 *   `<select>` sees its `<option>` children, and `<input type="range"
 *   min max>` has its bounds before `.value` is assigned.
 */

/** @param {*} value @returns {boolean} Whether `value` is iterable and not a string or `Node` (a string is one child, not a list of characters). */
function isIterableList(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof globalThis.Node) &&
    typeof value[Symbol.iterator] === "function"
  );
}

/**
 * Whether a positional argument (`tag` or `props`) is a child rather than
 * a tag name / attributes object. A plain object is never a child here (it
 * is an attributes object), and neither is a function.
 * @param {*} value
 * @returns {boolean}
 */
function isChildShaped(value) {
  const type = typeof value;
  return (
    type === "string" ||
    type === "number" ||
    type === "bigint" ||
    type === "boolean" ||
    value instanceof globalThis.Node ||
    isIterableList(value)
  );
}

/**
 * Flatten children into a flat array of `Node`s/strings to append. Collects
 * everything BEFORE anything is appended, so passing a live collection
 * (`el.childNodes`, `el.children`) is safe even though appending moves its
 * nodes out of it.
 * @param {Array<*>} children
 * @param {Array<*>} [out]
 * @returns {Array<*>}
 */
function flattenChildren(children, out = []) {
  for (const child of children) {
    if (child === null || child === undefined || child === true || child === false) continue;
    if (typeof child === "string" || typeof child === "number" || typeof child === "bigint") {
      out.push(String(child));
    } else if (isIterableList(child)) {
      flattenChildren([...child], out);
    } else {
      // A `Node` -- or anything else, appended as-is exactly as before
      // (`append()` stringifies a non-Node).
      out.push(child);
    }
  }
  return out;
}

/** @param {string} name @returns {string} `fontSize` -> `font-size`; used only where an element has no `style` object to assign to. */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * @param {Element} element
 * @param {Record<string, *>} declarations
 */
function applyStyleObject(element, declarations) {
  const { style } = element;
  const entries = Object.entries(declarations).filter(
    ([, value]) => value !== null && value !== undefined && value !== false,
  );
  if (!style) {
    // An element with no `style` object (e.g. a MathML element in a DOM
    // implementation that builds it as a plain `Element`) still gets the
    // declarations, as an attribute string.
    const text = entries
      .map(([name, value]) => `${name.startsWith("--") ? name : kebab(name)}: ${value}`)
      .join("; ");
    if (text) element.setAttribute("style", text);
    return;
  }
  for (const [name, value] of entries) {
    if (name.includes("-")) style.setProperty(name, String(value));
    else style[name] = String(value);
  }
}

/**
 * @param {Element} element
 * @param {string|Array<*>|Record<string, *>} value
 */
function applyClass(element, value) {
  if (Array.isArray(value)) {
    const names = value.filter((name) => typeof name === "string" && name !== "");
    if (names.length) element.classList.add(...names);
  } else if (typeof value === "object") {
    for (const [name, on] of Object.entries(value)) if (on) element.classList.add(name);
  } else {
    element.setAttribute("class", value);
  }
}

/**
 * @param {EventTarget} target
 * @param {string} type
 * @param {*} spec A listener (function or `{handleEvent}` object), or a
 *   `[listener, options]` tuple. `null`/`undefined`/`false` add nothing.
 */
function addListener(target, type, spec) {
  if (spec === null || spec === undefined || spec === false) return;
  const [listener, options] = Array.isArray(spec) ? spec : [spec];
  target.addEventListener(type, listener, options);
}

/**
 * @param {string|null} [namespace] `null` for `document.createElement`,
 *   or an XML namespace URI for `document.createElementNS` (see
 *   `createSVGElement`/`createMathMLElement` below).
 * @returns {(tag?: *, props?: *, ...children: Array<*>) => Element|DocumentFragment}
 */
export function createElementNS(namespace = null) {
  return (tag = "", props = {}, ...children) => {
    if (props === null || props === undefined) props = {};
    if (typeof tag !== "string" && isChildShaped(tag)) {
      // `props` may genuinely be a second child (passed positionally where
      // an attributes object would normally go, e.g.
      // createElement(nodeA, nodeB, nodeC)) -- but it may also just be the
      // *default* `{}` from the `props = {}` parameter default, when the
      // caller passed a single bare Node and nothing else. A bare `{}` is
      // never a valid child either way (fragments have no attributes to
      // apply it to), so it's only re-included when it's actually
      // child-shaped -- otherwise a single-Node call like
      // createElement(someNode) would silently gain a second, bogus child.
      const secondChild = isChildShaped(props) ? [props] : [];
      children = [tag, ...secondChild, ...children];
      props = {};
      tag = "";
    } else if (isChildShaped(props)) {
      children.unshift(props);
      props = {};
    }

    const element = tag
      ? namespace === null
        ? globalThis.document.createElement(tag)
        : globalThis.document.createElementNS(namespace, tag)
      : new globalThis.DocumentFragment();

    const properties = [];

    for (const [key, value] of Object.entries(props)) {
      if (key === "children") {
        children = [value, ...children];
        continue;
      }
      if (key.startsWith(".")) {
        properties.push([key.slice(1), value]);
        continue;
      }
      if (key.startsWith("@") && typeof value !== "string") {
        // A STRING `@type` value falls through to an attribute, as before --
        // template libraries like Alpine.js read `@click="..."` attributes.
        addListener(element, key.slice(1), value);
        continue;
      }
      if (typeof value === "function" && key.length > 2 && key.slice(0, 2).toLowerCase() === "on") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
        continue;
      }
      if (value === null || value === undefined) continue;
      if (typeof value === "boolean") {
        if (key.startsWith("aria-") || key.startsWith("data-")) element.setAttribute(key, String(value));
        else if (value) element.setAttribute(key, "");
        continue;
      }
      if (key === "class") {
        applyClass(element, value);
        continue;
      }
      if (key === "style" && typeof value === "object") {
        applyStyleObject(element, value);
        continue;
      }
      element.setAttribute(key, value);
    }

    for (const child of flattenChildren(children)) {
      element.append(typeof child === "string" ? globalThis.document.createTextNode(child) : child);
    }

    // Properties last: after children (a `<select>`'s `.value` needs its
    // `<option>`s) and after attributes (an `<input type=range>`'s `.value`
    // is clamped to `min`/`max`).
    for (const [name, value] of properties) element[name] = value;

    return element;
  };
}

/** The default namespace-less factory -- `document.createElement`-shaped. */
const createElement = createElementNS(null);

/** SVG namespace factory -- `createElement`-shaped, but for `document.createElementNS(SVG_NAMESPACE, ...)`. */
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const createSVGElement = createElementNS(SVG_NAMESPACE);

/** MathML namespace factory -- `createElement`-shaped, but for `document.createElementNS(MATHML_NAMESPACE, ...)`. Exported for the same reason `SVG_NAMESPACE`/`createSVGElement` are: `react-to-dom.mjs` reuses this rather than inventing a separate namespace mechanism. */
export const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
export const createMathMLElement = createElementNS(MATHML_NAMESPACE);

/** Shorthand for building a bare `DocumentFragment` of children -- `createElement()` with no tag, spelled without the empty first argument. */
export const _ = (...children) => createElement(...children);

/** Re-exported for convenience -- the same `textToDom` this module itself uses nowhere directly, but that pairs naturally with hand-built elements (e.g. `createElement("div", {}, ...textToDom(str).childNodes)`). */
export { default as fromString } from "./text-to-dom.mjs";

export default createElement;
