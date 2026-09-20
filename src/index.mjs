/**
 * index.mjs -- public barrel for @johnhenry/domable.
 *
 * HTML/SVG per-tag shorthands (`div`, `circle`, etc.) are deliberately NOT
 * re-exported here -- both tag sets independently define common names
 * (`a`, `audio`, `canvas`, `iframe`, `script`, `style`, `svg`, `title`,
 * `video`, ...), so flattening them into one namespace would silently
 * collide. Import them from their own subpaths instead:
 *   import { div, ul, li } from "@johnhenry/domable/html";
 *   import { circle, path } from "@johnhenry/domable/svg";
 */

export { default as textToDom } from "./text-to-dom.mjs";
export { default as domToText } from "./dom-to-text.mjs";
export { default as domToReact } from "./dom-to-react.mjs";
export { default as reactToDom } from "./react-to-dom.mjs";
export { default as textToReact } from "./text-to-react.mjs";
export { default as reactToText } from "./react-to-text.mjs";

export {
  default as createElement,
  createElementNS,
  createSVGElement,
  SVG_NAMESPACE,
  _,
  fromString,
} from "./create-element.mjs";

export {
  shadowOpen,
  shadowClosed,
  light,
  register,
  constructSuperclass,
} from "./simple-element.mjs";

export {
  default as domToHyperscript,
  hyperscriptToSource,
  domToSource,
} from "./dom-to-hyperscript.mjs";
