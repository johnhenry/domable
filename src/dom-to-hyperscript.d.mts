/**
 * dom-to-hyperscript.d.mts -- type declarations for dom-to-hyperscript.mjs.
 */

/**
 * The `{tag, props, children}` data shape `domToHyperscript` converts a DOM
 * node into -- `props` excludes `children` and keeps `class` as `class`
 * (targets `create-element.mjs`'s own attribute convention, NOT React's
 * `className`, unlike `dom-to-react.mjs`).
 */
export interface HyperscriptNode {
  /** `null` for a fragment (no wrapping tag). */
  tag: string | null;
  /** Attribute name/value pairs (always plain strings, since DOM attributes are always strings). */
  props: Record<string, string>;
  children: Array<HyperscriptNode | string>;
}

/**
 * @param dom
 * @returns A bare string for a text node; a `HyperscriptNode` for anything else.
 */
declare function domToHyperscript(dom: Node): HyperscriptNode | string;

export default domToHyperscript;

export interface HyperscriptToSourceOptions {
  /** Identifier the emitted source calls. Default `"createElement"`. */
  fn?: string;
  /** When set, pretty-prints with this indent unit; single-line otherwise. */
  indent?: string;
}

/**
 * @param node
 * @param options
 * @returns Literal, re-parseable JS source text, e.g.
 *   `createElement("div", {"id":"foo"}, createElement("span", {}, "hi"))`.
 */
export function hyperscriptToSource(
  node: HyperscriptNode | string,
  options?: HyperscriptToSourceOptions,
): string;

/**
 * `domToHyperscript` + `hyperscriptToSource` composed -- DOM straight to
 * re-parseable `createElement()` source text.
 */
export function domToSource(dom: Node, options?: HyperscriptToSourceOptions): string;
