import { describe, it } from "node:test";
import assert from "node:assert/strict";

import domToText from "../src/dom-to-text.mjs";
import textToDom from "../src/text-to-dom.mjs";
import { shadowOpen, shadowClosed } from "../src/simple-element.mjs";

let tagCounter = 0;

describe("domToText", () => {
  it("serializes a simple element", () => {
    const el = document.createElement("div");
    el.setAttribute("id", "foo");
    el.append(document.createTextNode("hi"));
    assert.equal(domToText(el), '<div id="foo">hi</div>');
  });

  it("serializes multiple nodes joined by newline", () => {
    const a = document.createElement("li");
    a.textContent = "one";
    const b = document.createElement("li");
    b.textContent = "two";
    assert.equal(domToText(a, b), "<li>one</li>\n<li>two</li>");
  });

  it("round-trips through textToDom for plain markup", () => {
    const original = '<ul id="list"><li>one</li><li>two</li></ul>';
    const frag = textToDom(original);
    assert.equal(domToText(...frag.childNodes), original);
  });

  it("void elements have no closing tag", () => {
    const br = document.createElement("br");
    assert.equal(domToText(br), "<br>");
  });

  it("escapes text content", () => {
    const el = document.createElement("div");
    el.textContent = "<script>alert(1)</script>";
    assert.equal(domToText(el), "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>");
  });

  it("does not escape raw-text elements (script/style)", () => {
    const el = document.createElement("script");
    el.textContent = "if (1 < 2) {}";
    assert.equal(domToText(el), "<script>if (1 < 2) {}</script>");
  });

  // Issue #3 ("domToText drops open shadow roots created by simple-element
  // in Chrome") is a bug in `serializeWithNativeGetHTML()`'s native
  // `Element#getHTML({serializableShadowRoots: true})` path -- fixed at the
  // source in simple-element.mjs (`attachShadow({..., serializable: true})`
  // for open shadow roots; see its module doc comment and
  // test/simple-element.test.mjs's "attachShadow's serializable flag"
  // block). That native path cannot be exercised here: jsdom (this repo's
  // test environment) does not implement `Element#getHTML()` at all, so
  // every test below always takes `serializeManually()`'s fallback branch,
  // which reads `el.shadowRoot` directly and was never affected by this bug
  // (it doesn't consult `serializable`). These tests therefore verify
  // domToText's shadow-DOM handling is correct under jsdom, but do NOT --
  // cannot -- reproduce or verify the fix for the actual reported Chrome
  // bug end-to-end; see test/simple-element.test.mjs for the targeted unit
  // test of the actual fix (that `attachShadow()` is called with
  // `serializable: true`).
  it("serializes an OPEN shadow root as declarative shadow DOM", () => {
    tagCounter++;
    const tag = `open-el-${tagCounter}`;
    customElements.define(tag, shadowOpen`<span>shadow content</span>`);
    const el = document.createElement(tag);
    assert.equal(domToText(el), `<${tag}><template shadowrootmode="open"><span>shadow content</span></template></${tag}>`);
  });

  it("a CLOSED shadow root cannot be serialized -- documented platform limitation, not a bug", () => {
    tagCounter++;
    const tag = `closed-el-${tagCounter}`;
    customElements.define(tag, shadowClosed`<span>secret</span>`);
    const el = document.createElement(tag);
    assert.equal(el.shadowRoot, null, "closed shadow roots are unreadable from outside by design");
    assert.equal(domToText(el), `<${tag}></${tag}>`);
  });

  it("serializes light-DOM children alongside a shadow root (slotted content)", () => {
    tagCounter++;
    const tag = `slotted-el-${tagCounter}`;
    customElements.define(tag, shadowOpen`<slot></slot>`);
    const el = document.createElement(tag);
    el.append(document.createTextNode("light content"));
    assert.equal(
      domToText(el),
      `<${tag}><template shadowrootmode="open"><slot></slot></template>light content</${tag}>`,
    );
  });
});
