import { describe, it } from "node:test";
import assert from "node:assert/strict";

import reactToDom from "../src/react-to-dom.mjs";
import domToReact from "../src/dom-to-react.mjs";

const el = (type, props) => ({ $$typeof: Symbol.for("react.element"), type, key: null, ref: null, props, _owner: null, _store: {} });

describe("reactToDom", () => {
  it("converts a React-element-shaped object to a real DOM element", () => {
    const react = el("div", { id: "foo", children: "hi" });
    const dom = reactToDom(react);
    assert.equal(dom.tagName, "DIV");
    assert.equal(dom.getAttribute("id"), "foo");
    assert.equal(dom.textContent, "hi");
  });

  it("translates className back to class, the inverse of domToReact's translation", () => {
    const react = el("div", { className: "a b" });
    const dom = reactToDom(react);
    assert.equal(dom.getAttribute("class"), "a b");
    assert.equal(dom.getAttribute("className"), null);
  });

  it("recurses into children", () => {
    const react = el("ul", { children: [el("li", { children: "one" }), el("li", { children: "two" })] });
    const dom = reactToDom(react);
    assert.equal(dom.children.length, 2);
    assert.equal(dom.children[0].textContent, "one");
    assert.equal(dom.children[1].textContent, "two");
  });

  it("a single (non-array) child is handled, matching real React's flexible children shape", () => {
    const react = el("div", { children: el("span", { children: "solo" }) });
    const dom = reactToDom(react);
    assert.equal(dom.children.length, 1);
    assert.equal(dom.children[0].tagName, "SPAN");
  });

  it("a Fragment element with a single child does not crash (the bug this fixes)", () => {
    const react = { $$typeof: Symbol.for("react.element"), type: Symbol.for("react.fragment"), props: { children: el("div", { children: "x" }) } };
    const dom = reactToDom(react);
    assert.equal(dom.nodeType, 11); // DOCUMENT_FRAGMENT_NODE
    assert.equal(dom.childNodes.length, 1);
  });

  it("round-trips: reactToDom(domToReact(node)) reproduces the original node's tag, attributes, and content", () => {
    // Attribute ORDER is deliberately not asserted: className is destructured
    // out of props and re-added last in reactToDom, which doesn't preserve
    // its original position -- harmless (attribute order carries no HTML
    // semantics), but it does mean outerHTML strings aren't byte-identical.
    const original = document.createElement("div");
    original.setAttribute("class", "card");
    original.setAttribute("data-id", "42");
    const child = document.createElement("span");
    child.textContent = "hello";
    original.append(child, document.createTextNode(" world"));

    const rebuilt = reactToDom(domToReact(original));
    assert.equal(rebuilt.tagName, original.tagName);
    assert.equal(rebuilt.getAttribute("class"), original.getAttribute("class"));
    assert.equal(rebuilt.getAttribute("data-id"), original.getAttribute("data-id"));
    assert.equal(rebuilt.textContent, original.textContent);
    assert.equal(rebuilt.firstElementChild.tagName, "SPAN");
  });

  it("round-trips: domToReact(reactToDom(element)) reproduces the original element", () => {
    const original = el("div", { className: "card", children: [el("span", { children: "hi" })] });
    const rebuilt = domToReact(reactToDom(original));
    assert.equal(rebuilt.type, original.type);
    assert.equal(rebuilt.props.className, original.props.className);
    assert.equal(rebuilt.props.children[0].type, "span");
  });

  it("builds <svg> and its descendants in the SVG namespace, not HTML (issue #2)", () => {
    const react = el("svg", { children: [el("circle", { r: "5" }), el("g", { children: [el("path", { d: "M0 0" })] })] });
    const dom = reactToDom(react);
    const SVG_NS = "http://www.w3.org/2000/svg";
    assert.equal(dom.namespaceURI, SVG_NS, "svg itself must be in the SVG namespace");
    assert.equal(dom.children[0].namespaceURI, SVG_NS, "circle must be in the SVG namespace");
    assert.equal(dom.children[1].namespaceURI, SVG_NS, "g must be in the SVG namespace");
    assert.equal(dom.children[1].children[0].namespaceURI, SVG_NS, "path (grandchild) must be in the SVG namespace");
  });

  it("builds <math> and its descendants in the MathML namespace (issue #2)", () => {
    const react = el("math", { children: [el("mrow", { children: [el("mi", { children: "x" })] })] });
    const dom = reactToDom(react);
    const MATHML_NS = "http://www.w3.org/1998/Math/MathML";
    assert.equal(dom.namespaceURI, MATHML_NS);
    assert.equal(dom.children[0].namespaceURI, MATHML_NS);
    assert.equal(dom.children[0].children[0].namespaceURI, MATHML_NS);
  });

  it("elements outside svg/math still build in the default HTML namespace (no regression)", () => {
    const react = el("div", { children: [el("span", { children: "hi" })] });
    const dom = reactToDom(react);
    const HTML_NS = "http://www.w3.org/1999/xhtml";
    assert.equal(dom.namespaceURI, HTML_NS);
    assert.equal(dom.children[0].namespaceURI, HTML_NS);
  });
});
