import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { shadowOpen, shadowClosed, light, register, constructSuperclass } from "../src/simple-element.mjs";
import createElement from "../src/create-element.mjs";

let tagCounter = 0;
const freshTag = (prefix) => `${prefix}-${++tagCounter}`;
/** Light-DOM content is appended in connectedCallback() (see simple-element.mjs's module doc comment for why) -- tests that check it must actually connect the element first. */
const connect = (el) => (document.body.append(el), el);

describe("simple-element", () => {
  it("shadowOpen: builds a class with an accessible shadow root, from a template string (tag-function usage)", () => {
    const tag = freshTag("open-tf");
    customElements.define(tag, shadowOpen`<div>shadow content</div>`);
    const el = document.createElement(tag);
    assert.ok(el.shadowRoot);
    assert.equal(el.shadowRoot.mode, "open");
    assert.equal(el.shadowRoot.innerHTML, "<div>shadow content</div>");
  });

  it("shadowOpen: also works as a regular function call", () => {
    const tag = freshTag("open-fn");
    customElements.define(tag, shadowOpen("<span>x</span>"));
    const el = document.createElement(tag);
    assert.ok(el.shadowRoot);
  });

  it("shadowClosed: shadow root is inaccessible from outside", () => {
    const tag = freshTag("closed");
    customElements.define(tag, shadowClosed`<div>secret</div>`);
    const el = document.createElement(tag);
    assert.equal(el.shadowRoot, null);
  });

  it("light: no shadow root at all -- children appended directly", () => {
    const tag = freshTag("light");
    customElements.define(tag, light`<div>plain</div>`);
    const el = connect(document.createElement(tag));
    assert.equal(el.shadowRoot, null);
    assert.equal(el.innerHTML, "<div>plain</div>");
  });

  it("reconnecting a light element does not duplicate its content", () => {
    const tag = freshTag("reconnect");
    customElements.define(tag, light`<span>x</span>`);
    const el = connect(document.createElement(tag));
    el.remove();
    connect(el);
    assert.equal(el.innerHTML, "<span>x</span>");
  });

  it("each instantiated element gets its own independent DOM nodes, not shared references", () => {
    const tag = freshTag("independent");
    customElements.define(tag, light`<span>hi</span>`);
    const a = connect(document.createElement(tag));
    const b = connect(document.createElement(tag));
    a.firstChild.textContent = "changed";
    assert.equal(b.firstChild.textContent, "hi", "mutating one instance must not affect another");
  });

  it("register() defines the custom element directly", () => {
    const tag = freshTag("registered");
    register(tag, {})`<p>registered</p>`;
    const el = document.createElement(tag);
    assert.ok(el.shadowRoot);
  });

  it("accepts a real Node directly, not just an HTML string (new: avoids a pointless serialize-then-reparse round trip)", () => {
    const built = createElement("div", { class: "from-create-element" }, "built via createElement");
    const tag = freshTag("from-node");
    customElements.define(tag, light(built));
    const el = connect(document.createElement(tag));
    assert.equal(el.innerHTML, '<div class="from-create-element">built via createElement</div>');
  });

  it("Node input is cloned per instance, not moved (a shared source Node can back multiple elements)", () => {
    const built = createElement("span", {}, "shared source");
    const tag = freshTag("cloned");
    customElements.define(tag, light(built));
    const a = connect(document.createElement(tag));
    const b = connect(document.createElement(tag));
    assert.equal(a.innerHTML, "<span>shared source</span>");
    assert.equal(b.innerHTML, "<span>shared source</span>");
    assert.notEqual(a.firstChild, b.firstChild);
  });

  it("constructSuperclass: independently controls light-DOM and shadow-DOM content", () => {
    const tag = freshTag("super");
    customElements.define(
      tag,
      constructSuperclass({ HTML: "<p>light</p>", shadowHTML: "<style>*{color:red}</style>" }),
    );
    const el = connect(document.createElement(tag));
    assert.equal(el.innerHTML, "<p>light</p>");
    assert.equal(el.shadowRoot.innerHTML, "<style>*{color:red}</style>");
  });

  it("constructSuperclass: also accepts Node input for HTML/shadowHTML", () => {
    const tag = freshTag("super-node");
    const lightNode = createElement("p", {}, "node light");
    customElements.define(tag, constructSuperclass({ HTML: lightNode }));
    const el = connect(document.createElement(tag));
    assert.equal(el.innerHTML, "<p>node light</p>");
  });
});
