/**
 * text-to-react.mjs -- HTML string straight to a React-element-shaped
 * object. New in this package (none of the six original modules covered
 * this corner of the Text/DOM/React triangle directly) -- a thin
 * composition of `text-to-dom.mjs` + `dom-to-react.mjs`, not a
 * reimplementation, so it stays correct automatically if either changes.
 */

import textToDom from "./text-to-dom.mjs";
import domToReact from "./dom-to-react.mjs";

/**
 * @param {string} str
 * @returns {object|string|null} See `dom-to-react.mjs`'s own return type
 *   for what a single top-level node converts to; a string with more than
 *   one top-level node returns a React Fragment element wrapping all of them.
 */
export default function textToReact(str) {
  return domToReact(textToDom(str));
}
