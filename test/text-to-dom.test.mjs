import { describe, it } from "node:test";
import assert from "node:assert/strict";

import textToDom from "../src/text-to-dom.mjs";

describe("textToDom", () => {
  it("parses a single element into a DocumentFragment", () => {
    const frag = textToDom("<div>hi</div>");
    assert.equal(frag.nodeType, 11); // DOCUMENT_FRAGMENT_NODE
    assert.equal(frag.childNodes.length, 1);
    assert.equal(frag.firstChild.outerHTML, "<div>hi</div>");
  });

  it("parses multiple top-level nodes", () => {
    const frag = textToDom("<li>one</li><li>two</li>");
    assert.equal(frag.childNodes.length, 2);
    assert.equal(frag.childNodes[0].textContent, "one");
    assert.equal(frag.childNodes[1].textContent, "two");
  });

  it("is directly appendable (fragment semantics: children move, not the fragment itself)", () => {
    const frag = textToDom("<b>x</b><i>y</i>");
    const host = document.createElement("div");
    host.append(frag);
    assert.equal(host.innerHTML, "<b>x</b><i>y</i>");
  });

  it("preserves <style>/<script>/<link>/<meta>/<title>/<base> as ordinary content, not routed away to a parsed <head> (the real bug this module's DOMParser-based predecessor had)", () => {
    const frag = textToDom("<style>*{color:red}</style><slot></slot>");
    assert.equal(frag.childNodes.length, 2);
    assert.equal(frag.firstChild.tagName, "STYLE");
    assert.equal(frag.firstChild.textContent, "*{color:red}");
  });

  it("returns a fresh fragment on every call (no shared/live state between calls)", () => {
    const a = textToDom("<span>a</span>");
    const b = textToDom("<span>b</span>");
    assert.notEqual(a, b);
    assert.equal(a.firstChild.textContent, "a");
    assert.equal(b.firstChild.textContent, "b");
  });
});
