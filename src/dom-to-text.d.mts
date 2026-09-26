/**
 * dom-to-text.d.mts -- type declarations for dom-to-text.mjs.
 */

/**
 * Serialize one or more real DOM nodes back into an HTML string. Multiple
 * nodes are joined by `"\n"`. Shadow-DOM-aware: emits Declarative Shadow DOM
 * syntax (`<template shadowrootmode="...">...</template>`) for any element
 * with an accessible (`element.shadowRoot`) shadow root. A `mode: 'closed'`
 * shadow root cannot be recovered (`element.shadowRoot` is `null` by
 * design) and serializes as just the host element with no shadow content.
 */
declare function domToText(...nodes: Node[]): string;

export default domToText;
