/**
 * simple-element.mjs -- build a Custom Element class from an HTML string
 * (or, new in this package, a real `Node`/`DocumentFragment` -- see
 * "NODE INPUT" below), for `globalThis.customElements.define(tag, class)`.
 *
 * Ported from the standalone `simple-element` module (previously named
 * "textElement"), with two additions:
 *
 * NODE INPUT: the original only accepted an HTML string (via regular-
 * function or tag-function call). Now that this lives alongside
 * `create-element.mjs`, which builds real DOM trees directly, requiring
 * every caller to serialize a hand-built tree to a string just so this
 * module could re-parse it back into DOM was a pointless round-trip.
 * `shadowOpen`/`shadowClosed`/`light`/`constructSuperclass` all now accept
 * a `Node` directly (`instanceof Node`) in any string-accepting position --
 * a fresh `.cloneNode(true)` is taken per instantiated custom element (each
 * instance needs its own nodes; the same node object can't be `.append()`ed
 * into two different elements, since `append()` moves an already-attached
 * node out of its current parent).
 *
 * `light`: the underlying factory already supported `useShadow: false`
 * internally, but only `shadowOpen`/`shadowClosed` (both `useShadow: true`)
 * were exported as ready-to-use presets -- `light` completes the
 * open/closed/none set of shadow-DOM configurations. Exposing and testing
 * this path (the original never did either) surfaced a real, previously
 * latent bug in the ported `useShadow: false` branch: the Custom Elements
 * spec forbids a constructor from giving `this` (the element's own light
 * DOM) any children synchronously -- only shadow-DOM content is allowed
 * during construction (real browsers enforce this, not just a test-
 * environment quirk: constructing via `document.createElement()` must
 * yield something indistinguishable from what the HTML parser would
 * produce, which starts every element childless). Light-DOM content is
 * therefore appended in `connectedCallback()` instead, guarded so
 * reconnecting an already-initialized element doesn't duplicate it.
 */

import textToDom from "./text-to-dom.mjs";

const { HTMLElement } = globalThis;

/** @param {string|Node} input @returns {Node[]} Fresh, independently-appendable nodes -- see "NODE INPUT" above for why a clone, not the original node. */
function toChildren(input) {
  if (!input) return [];
  if (input instanceof globalThis.Node) return [input.cloneNode(true)];
  return [...textToDom(input).childNodes];
}

/**
 * @param {{shadowMode?: 'open'|'closed', useShadow?: boolean, baseElement?: typeof HTMLElement}} [options]
 * @returns {(strsOrNode: string|Node|TemplateStringsArray, ...substs: string[]) => typeof HTMLElement}
 */
const createElement =
  ({ shadowMode = "open", useShadow = true, baseElement = HTMLElement } = {}) =>
  (strsOrNode, ...substs) => {
    const input =
      strsOrNode instanceof globalThis.Node || typeof strsOrNode === "string"
        ? strsOrNode
        : substs.reduce((prev, cur, i) => prev + cur + strsOrNode[i + 1], strsOrNode[0]);

    return class extends baseElement {
      #lightInitialized = false;

      constructor() {
        super();
        // Shadow-DOM content IS allowed synchronously in the constructor
        // -- only light-DOM children (the `else` case, below, deferred to
        // connectedCallback) are restricted. See module doc comment.
        if (useShadow) this.attachShadow({ mode: shadowMode }).append(...toChildren(input));
      }

      connectedCallback() {
        if (useShadow || this.#lightInitialized) return;
        this.#lightInitialized = true;
        this.append(...toChildren(input));
      }
    };
  };

/**
 * @param {string} tagname
 * @param {object} options Same shape `createElement()` takes.
 * @param {...*} rest Forwarded to `customElements.define()` after the class.
 * @returns {(strsOrNode: string|Node|TemplateStringsArray, ...substs: string[]) => void}
 */
export const register =
  (tagname, options, ...rest) =>
  (strsOrNode, ...substs) =>
    globalThis.customElements.define(tagname, createElement(options)(strsOrNode, ...substs), ...rest);

/** Shadow DOM, accessible from outside the element (`element.shadowRoot` returns the real root). */
export const shadowOpen = createElement();
/** Shadow DOM, inaccessible from outside the element (`element.shadowRoot` returns `null`) -- see `dom-to-text.mjs`'s own doc comment for what this means for serialization. */
export const shadowClosed = createElement({ shadowMode: "closed" });
/** No shadow DOM at all -- children are appended directly into light DOM. */
export const light = createElement({ useShadow: false });

/**
 * Lower-level than `shadowOpen`/`shadowClosed`/`light`: independently
 * control light-DOM and shadow-DOM content on the same element (e.g. a
 * component with both a `<style>`-bearing shadow tree AND default light-DOM
 * fallback content).
 *
 * @param {{HTML?: string|Node, shadowHTML?: string|Node, shadowMode?: 'open'|'closed', baseElement?: typeof HTMLElement}} [options]
 * @returns {typeof HTMLElement}
 */
export const constructSuperclass = ({
  HTML = "",
  shadowHTML = "",
  shadowMode = "open",
  baseElement = HTMLElement,
} = {}) => {
  return class extends baseElement {
    #lightInitialized = false;

    constructor() {
      super();
      if (shadowHTML) this.attachShadow({ mode: shadowMode }).append(...toChildren(shadowHTML));
    }

    connectedCallback() {
      if (!HTML || this.#lightInitialized) return;
      this.#lightInitialized = true;
      this.append(...toChildren(HTML));
    }
  };
};
