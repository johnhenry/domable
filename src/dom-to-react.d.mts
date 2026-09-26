/**
 * dom-to-react.d.mts -- type declarations for dom-to-react.mjs.
 */

/**
 * A plain object shaped like a real React element (what `React.createElement()`
 * itself produces) -- `type`/`props` are the two fields every function in
 * this package's Text/DOM/React triangle actually reads or writes; the rest
 * are carried through for shape-compatibility with real React elements.
 */
export interface ReactElementLike {
  $$typeof?: symbol;
  type?: string | symbol | unknown;
  key?: unknown;
  ref?: unknown;
  props?: {
    /** DOM `class` is translated to `className` here, matching React's own convention (the inverse of `reactToDom`'s `className` -> `class`). */
    className?: string;
    children?: unknown;
    [prop: string]: unknown;
  };
  _owner?: unknown;
  _store?: Record<string, unknown>;
}

/**
 * Convert a real DOM node into a React-element-shaped plain object.
 * @param dom
 * @returns A React-element-shaped object; a bare string for a text node
 *   (matching real React's own convention); or `null` for a node type with
 *   no React-element representation (e.g. a comment). A `DocumentFragment`
 *   of exactly one node converts to that node directly, not a
 *   Fragment-wrapped single child.
 */
declare function domToReact(dom: Node): ReactElementLike | string | null;

export default domToReact;
