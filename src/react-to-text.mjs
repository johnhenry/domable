/**
 * react-to-text.mjs -- a React-element-shaped object straight to an HTML
 * string. New in this package, the other missing corner of the
 * Text/DOM/React triangle -- a thin composition of `react-to-dom.mjs` +
 * `dom-to-text.mjs`, not a reimplementation.
 */

import reactToDom from "./react-to-dom.mjs";
import domToText from "./dom-to-text.mjs";

/**
 * @param {{$$typeof?: symbol, type?: *, props?: object}} reactElement
 * @returns {string}
 */
export default function reactToText(reactElement) {
  return domToText(reactToDom(reactElement));
}
