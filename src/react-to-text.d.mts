/**
 * react-to-text.d.mts -- type declarations for react-to-text.mjs.
 */
import type { ReactElementLike } from "./dom-to-react.mjs";

/**
 * A React-element-shaped object straight to an HTML string (a thin
 * composition of `reactToDom` + `domToText`).
 * @param reactElement
 */
declare function reactToText(reactElement?: ReactElementLike | null): string;

export default reactToText;
