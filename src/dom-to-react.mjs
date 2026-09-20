/**
 * dom-to-react.mjs -- convert a real DOM node into a plain object shaped
 * like a React element (`{$$typeof, type, key, ref, props, _owner, _store}`)
 * -- the same shape `React.createElement()` itself produces, so the result
 * is usable anywhere a real React element is (passed to `ReactDOM.render()`,
 * diffed, etc.) without React itself being a dependency of this package.
 *
 * Ported from the standalone `dom-to-React` module, which had two real bugs
 * fixed here:
 *   1. The `DocumentFragment` branch pushed into a `children` array before
 *      it was ever declared (`children` was only declared later, inside the
 *      `ELEMENT_NODE` branch) -- a guaranteed `ReferenceError` the moment a
 *      fragment was passed in.
 *   2. Attributes were read via `Object.entries(dom.attributes)`.
 *      `dom.attributes` is a `NamedNodeMap`, not a plain object -- iterating
 *      its *own enumerable properties* with `Object.entries()` does not
 *      yield `[name, value]` pairs the way it would for a plain object, so
 *      no attribute ever actually made it into `props`. Fixed by iterating
 *      the `NamedNodeMap` directly (it's iterable; each entry is a real
 *      `Attr` node with `.name`/`.value`).
 *
 * `class` -> `className` is the one deliberate naming translation, matching
 * real React's own convention (`react-to-dom.mjs` translates it back).
 */

const $$typeof = Symbol.for("react.element");
const REACT_FRAGMENT_SYMBOL = Symbol.for("react.fragment");

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

/** @param {*} type @param {object} props @returns {object} */
function element(type, props) {
  return { $$typeof, type, key: null, ref: null, props, _owner: null, _store: {} };
}

/**
 * @param {Node} dom
 * @returns {object|string|null} A React-element-shaped object, a bare
 *   string (for a text node, matching real React's own convention of
 *   allowing a string directly as a child/return value), or `null` for a
 *   node type with no React-element representation (e.g. a comment).
 */
export default function domToReact(dom) {
  if (dom.nodeType === DOCUMENT_FRAGMENT_NODE) {
    const children = [];
    for (const child of dom.childNodes) children.push(domToReact(child));
    // A fragment of exactly one node converts to that node directly, not a
    // Fragment-wrapped single child -- e.g. textToReact("<div>x</div>")
    // (text-to-dom.mjs always returns a DocumentFragment) yields a plain
    // div-shaped element, matching what a caller actually expects to
    // inspect (`.type === "div"`), not an extra Fragment layer around it.
    if (children.length === 1) return children[0];
    return element(REACT_FRAGMENT_SYMBOL, { children });
  }

  if (dom.nodeType === ELEMENT_NODE) {
    const props = {};
    for (const attr of dom.attributes) {
      props[attr.name === "class" ? "className" : attr.name] = attr.value;
    }
    const children = [];
    for (const child of dom.childNodes) children.push(domToReact(child));
    props.children = children;
    return element(dom.tagName.toLowerCase(), props);
  }

  if (dom.nodeType === TEXT_NODE) return dom.nodeValue;

  return null;
}
