/**
 * create-element.d.mts -- type declarations for create-element.mjs.
 */

/**
 * A child accepted by `createElement`/`createElementNS`-built factories.
 * Strings, numbers and bigints become text nodes; a `Node` is appended
 * as-is; `null`/`undefined`/`true`/`false` are skipped (so `cond && el`
 * works); arrays and other non-string iterables (`NodeList`, generators,
 * `Set`s, ...) are flattened, recursively.
 */
export type Child = string | number | bigint | boolean | null | undefined | Node | Iterable<Child>;

/** A listener accepted by an `"@type"` key: a function, an `EventListener` object (`{ handleEvent }`), or `[listener, options]` (options as for `addEventListener`). `null`/`undefined`/`false` add nothing. A string is written as an attribute instead (e.g. for Alpine.js `@click="..."`). */
export type ListenerSpec =
  | EventListenerOrEventListenerObject
  | string
  | [EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions)?]
  | null
  | undefined
  | false;

/** `style` as an object: `kebab-case` and `--custom` keys go through `style.setProperty`, `camelCase` keys through `style[key] =`. `null`/`undefined`/`false` entries are skipped. */
export type StyleObject = Record<string, string | number | null | undefined | false>;

/** `class`: a string (set as-is), an array of strings (non-strings and `""` skipped), or a `{ name: boolean }` object (truthy names added). */
export type ClassValue = string | Array<string | null | undefined | false> | Record<string, unknown>;

/**
 * The props object accepted as the second argument to a factory returned by
 * `createElementNS()`. Keys are interpreted as follows (issue #9):
 *
 * - `".name"` -- sets the DOM property `element.name` to the value as-is
 *   (never an attribute; `false`/`null` are assigned, not skipped).
 *   Properties are assigned last, after attributes and children.
 * - `"@type"` -- `addEventListener(type, ...)`, `type` used verbatim; see
 *   `ListenerSpec`. A string value is an ordinary attribute.
 * - `"on<Event>"` with a FUNCTION value -- `addEventListener(event.toLowerCase(), fn)`.
 *   A non-function `on*` value is an ordinary attribute.
 * - `class`, `style`, `children` -- see below.
 * - anything else -- an attribute: `null`/`undefined`/`false` omit it,
 *   `true` sets it to `""` (`aria-*`/`data-*` booleans are written as
 *   `"true"`/`"false"` instead), any other value is stringified by
 *   `setAttribute`.
 */
export interface ElementProps {
  [key: string]: unknown;
  [property: `.${string}`]: unknown;
  [listener: `@${string}`]: ListenerSpec;
  class?: ClassValue | null | false;
  style?: string | StyleObject | null | false;
  /** Prepended to any positional children arguments -- for JSX-transform compatibility. */
  children?: Child;
}

/**
 * The callable shape returned by `createElementNS(namespace)` (and so also
 * `createElement`/`createSVGElement`/`createMathMLElement`/`_`, which are
 * all built from it). `tag` is optional: omit it (or pass a `Node`/string
 * positionally instead) to get a `DocumentFragment` of children back. When
 * `tag` is a non-empty string, the return is always a real `Element`.
 */
export type ElementFactory = (
  tag?: string | Child,
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
