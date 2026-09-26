/**
 * react-to-dom.d.mts -- type declarations for react-to-dom.mjs.
 */
import type { ReactElementLike } from "./dom-to-react.mjs";

/**
 * Convert a React-element-shaped plain object into a real DOM node.
 * `<svg>`/`<math>` elements (and their descendants) are built in the
 * correct SVG/MathML namespace, not the default HTML namespace.
 * @param reactElement
 * @param namespace The namespace URI new elements are built under (`null`
 *   for the default HTML namespace). Callers never need to pass this; it's
 *   threaded through the function's own recursion once a `svg`/`math`
 *   element switches it.
 * @returns An `Element` for a typed element, or a `DocumentFragment` for a
 *   Fragment (including the default when `reactElement` is `null`/`undefined`).
 */
declare function reactToDom(reactElement?: ReactElementLike | null, namespace?: string | null): Node;

export default reactToDom;
