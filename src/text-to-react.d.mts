/**
 * text-to-react.d.mts -- type declarations for text-to-react.mjs.
 */
import type { ReactElementLike } from "./dom-to-react.mjs";

/**
 * HTML string straight to a React-element-shaped object (a thin composition
 * of `textToDom` + `domToReact`).
 * @param str
 * @returns See `dom-to-react.mjs`'s own return type for what a single
 *   top-level node converts to; a string with more than one top-level node
 *   returns a React Fragment element wrapping all of them.
 */
declare function textToReact(str: string): ReactElementLike | string | null;

export default textToReact;
