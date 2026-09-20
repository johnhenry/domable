import { describe, it } from "node:test";
import assert from "node:assert/strict";

import domToHyperscript, { hyperscriptToSource, domToSource } from "../src/dom-to-hyperscript.mjs";
import createElement from "../src/create-element.mjs";

describe("domToHyperscript", () => {
  it("converts a plain element to a {tag, props, children} data structure", () => {
    const el = document.createElement("div");
    el.setAttribute("id", "foo");
    el.append(document.createTextNode("hi"));

    const h = domToHyperscript(el);
    assert.deepEqual(h, { tag: "div", props: { id: "foo" }, children: ["hi"] });
  });

  it("class stays class -- NOT translated to className (targets create-element's own convention, unlike domToReact)", () => {
    const el = document.createElement("div");
    el.setAttribute("class", "a b");
    assert.equal(domToHyperscript(el).props.class, "a b");
  });

  it("recurses into element children", () => {
    const parent = document.createElement("ul");
    const child = document.createElement("li");
    child.textContent = "item";
    parent.append(child);

    const h = domToHyperscript(parent);
    assert.equal(h.children.length, 1);
    assert.deepEqual(h.children[0], { tag: "li", props: {}, children: ["item"] });
  });
});

describe("hyperscriptToSource", () => {
  it("renders a leaf element as a createElement() call", () => {
    const h = { tag: "div", props: { id: "foo" }, children: ["hi"] };
    assert.equal(hyperscriptToSource(h), 'createElement("div", {"id":"foo"}, "hi")');
  });

  it("renders nested elements as nested calls", () => {
    const h = { tag: "ul", props: {}, children: [{ tag: "li", props: {}, children: ["item"] }] };
    assert.equal(hyperscriptToSource(h), 'createElement("ul", {}, createElement("li", {}, "item"))');
  });

  it("honors a custom function identifier", () => {
    const h = { tag: "div", props: {}, children: [] };
    assert.equal(hyperscriptToSource(h, { fn: "h" }), 'h("div", {})');
  });

  it("the emitted source is valid, re-evaluable JS that reconstructs an equivalent element", () => {
    const original = createElement("div", { id: "foo", class: "card" }, createElement("span", {}, "hi"));
    const source = domToSource(original);
    // eslint-disable-next-line no-new-func -- deliberately eval-ing generated source to prove it's real, re-parseable JS, not just source-shaped text.
    const rebuilt = new Function("createElement", `return ${source};`)(createElement);
    assert.equal(rebuilt.outerHTML, original.outerHTML);
  });

  it("pretty-prints with an indent option", () => {
    const h = { tag: "div", props: {}, children: [{ tag: "span", props: {}, children: ["x"] }] };
    assert.equal(
      hyperscriptToSource(h, { indent: "  " }),
      'createElement(\n  "div",\n  {},\n  createElement(\n    "span",\n    {},\n    "x"\n  )\n)',
    );
  });
});

describe("domToSource", () => {
  it("composes domToHyperscript + hyperscriptToSource", () => {
    const el = document.createElement("div");
    el.append(document.createTextNode("x"));
    assert.equal(domToSource(el), 'createElement("div", {}, "x")');
  });
});
