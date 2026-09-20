import { describe, it } from "node:test";
import assert from "node:assert/strict";

import domToReact from "../src/dom-to-react.mjs";

describe("domToReact", () => {
  it("converts a plain element to a React-element-shaped object", () => {
    const el = document.createElement("div");
    el.setAttribute("id", "foo");
    el.append(document.createTextNode("hi"));

    const react = domToReact(el);
    assert.equal(react.$$typeof, Symbol.for("react.element"));
    assert.equal(react.type, "div");
    assert.equal(react.props.id, "foo");
    assert.deepEqual(react.props.children, ["hi"]);
  });

  it("translates the class attribute to className, matching real React's convention", () => {
    const el = document.createElement("div");
    el.setAttribute("class", "a b c");
    const react = domToReact(el);
    assert.equal(react.props.className, "a b c");
    assert.equal("class" in react.props, false);
  });

  it("recurses into element children", () => {
    const parent = document.createElement("ul");
    const child = document.createElement("li");
    child.textContent = "item";
    parent.append(child);

    const react = domToReact(parent);
    assert.equal(react.props.children.length, 1);
    assert.equal(react.props.children[0].type, "li");
    assert.deepEqual(react.props.children[0].props.children, ["item"]);
  });

  it("a DocumentFragment with one child converts to that child directly, not a Fragment wrapper", () => {
    const frag = document.createDocumentFragment();
    const div = document.createElement("div");
    frag.append(div);
    const react = domToReact(frag);
    assert.equal(react.type, "div");
  });

  it("a DocumentFragment with multiple children converts to a Fragment element", () => {
    const frag = document.createDocumentFragment();
    frag.append(document.createElement("a"), document.createElement("b"));
    const react = domToReact(frag);
    assert.equal(react.type, Symbol.for("react.fragment"));
    assert.equal(react.props.children.length, 2);
  });

  it("a comment node converts to null (no React-element representation)", () => {
    const comment = document.createComment("nope");
    assert.equal(domToReact(comment), null);
  });
});
