/**
 * index.d.mts -- type declarations for index.mjs, the public barrel for
 * @johnhenry/domable. HTML/SVG per-tag shorthands are deliberately NOT
 * re-exported here -- import them from their own subpaths
 * (`@johnhenry/domable/html`, `@johnhenry/domable/svg`) instead. See
 * index.mjs's own doc comment for why.
 */

export { default as textToDom } from "./text-to-dom.mjs";
export { default as domToText } from "./dom-to-text.mjs";
export { default as domToReact } from "./dom-to-react.mjs";
export type { ReactElementLike } from "./dom-to-react.mjs";
export { default as reactToDom } from "./react-to-dom.mjs";
export { default as textToReact } from "./text-to-react.mjs";
export { default as reactToText } from "./react-to-text.mjs";

export {
  default as createElement,
  createElementNS,
  createSVGElement,
  SVG_NAMESPACE,
  createMathMLElement,
  MATHML_NAMESPACE,
  _,
  fromString,
} from "./create-element.mjs";
export type { Child, ElementProps, ElementFactory, ListenerSpec, StyleObject, ClassValue } from "./create-element.mjs";

export {
  shadowOpen,
  shadowClosed,
  light,
  register,
  constructSuperclass,
} from "./simple-element.mjs";
export type {
  Templateable,
  CreateElementOptions,
  ElementClassBuilder,
  ConstructSuperclassOptions,
} from "./simple-element.mjs";

export {
  default as domToHyperscript,
  hyperscriptToSource,
  domToSource,
} from "./dom-to-hyperscript.mjs";
export type { HyperscriptNode, HyperscriptToSourceOptions } from "./dom-to-hyperscript.mjs";
