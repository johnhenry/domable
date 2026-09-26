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

  // -- issue #3: "domToText drops open shadow roots created by simple-element
  // in Chrome" -- Chrome's native `Element#getHTML({serializableShadowRoots:
  // true})` (what dom-to-text.mjs prefers when available) only includes a
  // shadow root whose OWN `serializable` flag is true; `attachShadow()` here
  // never set it. jsdom (this repo's test environment, see
  // test/_setup-dom.mjs) does not implement `getHTML()` at all -- confirmed
  // by inspecting `Element.prototype.getHTML` under jsdom@30, it's
  // `undefined` -- and it neither stores nor exposes the `serializable`
  // option passed to `attachShadow()` as a readable property either (also
  // confirmed: `shadowRoot.serializable` is `undefined` even when
  // `attachShadow({serializable: true})` is called). That means this repo's
  // test suite CANNOT exercise the actual Chrome bug (or its fix) end to
  // end: dom-to-text.mjs always falls back to its manual `el.shadowRoot`
  // walker under jsdom, which was never affected by this bug in the first
  // place (it doesn't consult `serializable` at all). The most targeted
  // verification available here is a direct unit test of the fix itself --
  // that `attachShadow()` is actually called with `serializable: true` for
  // an open shadow root (and deliberately NOT for a closed one, see the
  // module doc comment's "SERIALIZABLE SHADOW ROOTS" section for why) --
  // by spying on `Element.prototype.attachShadow`.
  describe("attachShadow's serializable flag (issue #3, see comment above)", () => {
    /** @returns {{calls: object[], restore: () => void}} */
    function spyOnAttachShadow() {
      const original = Element.prototype.attachShadow;
      const calls = [];
      Element.prototype.attachShadow = function (options) {
        calls.push(options);
        return original.call(this, options);
      };
      return { calls, restore: () => (Element.prototype.attachShadow = original) };
    }

    it("shadowOpen: attaches a serializable shadow root, so native getHTML({serializableShadowRoots: true}) does not silently drop it", () => {
      const spy = spyOnAttachShadow();
      try {
        const tag = freshTag("open-serializable");
        customElements.define(tag, shadowOpen`<span>x</span>`);
        document.createElement(tag);
      } finally {
        spy.restore();
      }
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].mode, "open");
      assert.equal(spy.calls[0].serializable, true);
    });

    it("shadowClosed: does NOT attach a serializable shadow root (serializable is independent of mode -- opting a closed root in would let getHTML() leak content that element.shadowRoot correctly hides)", () => {
      const spy = spyOnAttachShadow();
      try {
        const tag = freshTag("closed-not-serializable");
        customElements.define(tag, shadowClosed`<span>secret</span>`);
        document.createElement(tag);
      } finally {
        spy.restore();
      }
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].mode, "closed");
      assert.equal(spy.calls[0].serializable, false);
    });

    it("constructSuperclass: shadowHTML with mode 'open' (the default) is also attached serializable", () => {
      const spy = spyOnAttachShadow();
      try {
        const tag = freshTag("super-serializable");
        customElements.define(tag, constructSuperclass({ shadowHTML: "<p>x</p>" }));
        document.createElement(tag);
      } finally {
        spy.restore();
      }
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].serializable, true);
    });

    it("constructSuperclass: shadowHTML with mode 'closed' is NOT attached serializable", () => {
      const spy = spyOnAttachShadow();
      try {
        const tag = freshTag("super-closed-not-serializable");
        customElements.define(tag, constructSuperclass({ shadowHTML: "<p>x</p>", shadowMode: "closed" }));
        document.createElement(tag);
      } finally {
        spy.restore();
      }
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].serializable, false);
    });
  });
});
