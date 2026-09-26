/**
 * text-to-dom.d.mts -- type declarations for text-to-dom.mjs.
 */

/**
 * Parse an HTML string into a real DOM tree.
 * @param str
 * @returns A `DocumentFragment` containing the parsed nodes.
 */
declare function textToDom(str: string): DocumentFragment;

export default textToDom;
