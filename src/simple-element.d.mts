/**
 * simple-element.d.mts -- type declarations for simple-element.mjs.
 */

/** Anything accepted where an HTML string or a `Node` is expected: a plain string, a real `Node`/`DocumentFragment`, or a template-tag-function call's `TemplateStringsArray`. */
export type Templateable = string | Node | TemplateStringsArray;

export interface CreateElementOptions {
  shadowMode?: "open" | "closed";
  useShadow?: boolean;
  baseElement?: typeof HTMLElement;
}

/** The callable shape `shadowOpen`/`shadowClosed`/`light` (and `createElement(options)` internally) all share -- usable as a template-tag function (`` shadowOpen`<div>...</div>` ``) or a regular call (`shadowOpen("<div>...</div>")`, `shadowOpen(someNode)`). */
export type ElementClassBuilder = (
  strsOrNode: Templateable,
  ...substs: string[]
) => typeof HTMLElement;

/**
 * @param tagname
 * @param options Same shape `ElementClassBuilder`'s underlying factory takes.
 * @param rest Forwarded to `customElements.define()` after the built class
 *   (e.g. an `ElementDefinitionOptions` with `extends`, for a customized
 *   built-in element).
 */
export function register(
  tagname: string,
  options?: CreateElementOptions,
  ...rest: unknown[]
): (strsOrNode: Templateable, ...substs: string[]) => void;

/** Shadow DOM, accessible from outside the element (`element.shadowRoot` returns the real root); attached with `serializable: true` so it round-trips through `domToText`'s native `getHTML()` path. */
export const shadowOpen: ElementClassBuilder;
/** Shadow DOM, inaccessible from outside the element (`element.shadowRoot` returns `null`); genuinely unrecoverable by any serializer, including `domToText`. */
export const shadowClosed: ElementClassBuilder;
/** No shadow DOM at all -- children are appended directly into light DOM (deferred to `connectedCallback()`, per the Custom Elements spec). */
export const light: ElementClassBuilder;

export interface ConstructSuperclassOptions {
  HTML?: string | Node;
  shadowHTML?: string | Node;
  shadowMode?: "open" | "closed";
  baseElement?: typeof HTMLElement;
}

/**
 * Lower-level than `shadowOpen`/`shadowClosed`/`light`: independently
 * control light-DOM and shadow-DOM content on the same element.
 */
export function constructSuperclass(options?: ConstructSuperclassOptions): typeof HTMLElement;
