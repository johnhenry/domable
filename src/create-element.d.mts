/**
 * create-element.d.mts -- type declarations for create-element.mjs.
 */

/** A child accepted by `createElement`/`createElementNS`-built factories: a plain string (becomes a text node) or a real `Node` (appended as-is). */
export type Child = string | Node;

/**
 * Attributes object accepted as the second argument to a factory returned by
 * `createElementNS()`. Every value is passed to `element.setAttribute(key,
 * value)` (so ultimately stringified) EXCEPT the two special keys below.
 */
export interface ElementProps {
  [attribute: string]: unknown;
  /** A string is set as-is via `setAttribute("class", ...)`; an array of strings is added individually via `classList.add(...value)`. */
  class?: string | string[];
  /** Prepended to any positional children arguments -- for JSX-transform compatibility. */
  children?: Child | Child[];
}

/**
 * The callable shape returned by `createElementNS(namespace)` (and so also
 * `createElement`/`createSVGElement`/`createMathMLElement`/`_`, which are
 * all built from it). `tag` is optional: omit it (or pass a `Node`/string
 * positionally instead) to get a `DocumentFragment` of children back. When
 * `tag` is a non-empty string, the return is always a real `Element`.
 */
export type ElementFactory = (
  tag?: string | Node,
  props?: ElementProps | Child | null,
  ...children: Child[]
) => Element | DocumentFragment;

/**
 * @param namespace `null` (default) for `document.createElement`, or an XML
 *   namespace URI for `document.createElementNS`.
 */
export function createElementNS(namespace?: string | null): ElementFactory;

/** The default namespace-less factory -- `document.createElement`-shaped. */
declare const createElement: ElementFactory;
export default createElement;

/** `"http://www.w3.org/2000/svg"` */
export const SVG_NAMESPACE: string;
/** SVG namespace factory -- `createElement`-shaped, but for `document.createElementNS(SVG_NAMESPACE, ...)`. */
export const createSVGElement: ElementFactory;

/** `"http://www.w3.org/1998/Math/MathML"` */
export const MATHML_NAMESPACE: string;
/** MathML namespace factory -- `createElement`-shaped, but for `document.createElementNS(MATHML_NAMESPACE, ...)`. */
export const createMathMLElement: ElementFactory;

/** Shorthand for building a bare `DocumentFragment` of children -- `createElement()` with no tag, spelled without the empty first argument. Forwards all arguments to `createElement` directly, so it accepts the same `(tag?, props?, ...children)` shape. */
export const _: ElementFactory;

/** Re-exported for convenience; see `text-to-dom.mjs`. */
export { default as fromString } from "./text-to-dom.mjs";
